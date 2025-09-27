export async function loader({ request }: { request: Request }) {
  const url = new URL(request.url);
  const symbol = url.searchParams.get("symbol");

  if (!symbol) {
    return Response.json({ error: "Symbol parameter is required" }, { status: 400 });
  }

  try {
    
    const symbolUpper = symbol.toUpperCase();
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    };

    // チャート情報を取得（100日間の日足データ）
    const chartUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbolUpper}?range=100d&interval=1d`;
    
    const chartResponse = await fetch(chartUrl, { headers });
    if (!chartResponse.ok) {
      throw new Error(`Chart API error: ${chartResponse.status}`);
    }
    const chartResponseData = await chartResponse.json() as any;

    // チャートデータから基本情報を抽出
    const result = chartResponseData.chart?.result?.[0];
    if (!result) {
      throw new Error("No chart data found");
    }

    const meta = result.meta;
    
    // チャートデータを処理
    const timestamps = result.timestamp || [];
    const indicators = result.indicators?.quote?.[0] || {};
    const volumes = indicators.volume || [];
    const lows = indicators.low || [];
    const highs = indicators.high || [];
    const opens = indicators.open || [];
    const closes = indicators.close || [];

    // チャートデータを整理（日足データ）
    const chartData = timestamps.map((timestamp: number, index: number) => {
      // Yahoo Finance APIのtimestampは秒単位なので、1000倍してミリ秒に変換
      const date = new Date(timestamp * 1000);
      
      // 日付の妥当性チェック
      const currentYear = new Date().getFullYear();
      const dataYear = date.getFullYear();
      
      // 2000年以前または現在年より5年先のデータは無効とする
      if (dataYear < 2000 || dataYear > currentYear + 5) {
        console.warn(`Invalid date detected: ${date.toISOString()} (year: ${dataYear})`);
        return null;
      }
      
      // 価格データの妥当性チェック
      const open = opens[index];
      const close = closes[index];
      const high = highs[index];
      const low = lows[index];
      const volume = volumes[index] || 0;
      
      // null値や無効な価格データをチェック
      if (open === null || close === null || high === null || low === null ||
          open <= 0 || close <= 0 || high <= 0 || low <= 0) {
        console.warn(`Invalid price data detected for date ${date.toISOString()}:`, {
          open, close, high, low, volume
        });
        return null;
      }
      
      // より厳密な価格データの整合性チェック
      // 高値は始値・終値・安値の最大値以上である必要がある
      // 安値は始値・終値・高値の最小値以下である必要がある
      if (high < Math.max(open, close) || low > Math.min(open, close)) {
        console.warn(`Price consistency error for date ${date.toISOString()}:`, {
          open, close, high, low, volume,
          issue: `High (${high}) should be >= max(open, close) (${Math.max(open, close)}), Low (${low}) should be <= min(open, close) (${Math.min(open, close)})`
        });
        return null;
      }
      
      // 異常に大きな価格変動をチェック（前日比で50%以上の変動は疑わしい）
      if (index > 0) {
        const prevClose = closes[index - 1];
        if (prevClose && prevClose > 0) {
          const priceChange = Math.abs(close - prevClose) / prevClose;
          if (priceChange > 0.5) { // 50%以上の変動
            console.warn(`Suspicious price change for date ${date.toISOString()}:`, {
              previousClose: prevClose,
              currentClose: close,
              changePercent: (priceChange * 100).toFixed(2) + '%'
            });
            return null;
          }
        }
      }
      
      return {
        date: date.toISOString().split('T')[0], // YYYY-MM-DD形式
        fullDate: date.toISOString().split('T')[0], // YYYY-MM-DD形式
        timestamp: timestamp,
        open: open,
        high: high,
        low: low,
        close: close,
        volume: volume
      };
    }).filter((item: any) => item !== null); // 無効なデータを除外

    // データの妥当性を最終チェック
    if (chartData.length === 0) {
      throw new Error("No valid chart data found after filtering");
    }

    // 日付の範囲をチェック（最新データが現在から1年以上古い場合は警告）
    const latestDate = new Date(Math.max(...chartData.map((item: any) => new Date(item.date).getTime())));
    const daysDiff = (new Date().getTime() - latestDate.getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysDiff > 365) {
      console.warn(`Latest data is ${Math.round(daysDiff)} days old: ${latestDate.toISOString()}`);
    }
    
    // 日付・時刻の処理
    const marketTime = meta.regularMarketTime ? new Date(meta.regularMarketTime * 1000) : new Date();
    const previousCloseTime = meta.previousCloseTime ? new Date(meta.previousCloseTime * 1000) : null;
    
    const stockInfo = {
      symbol: meta.symbol,
      longName: meta.longName || meta.shortName || symbolUpper,
      shortName: meta.shortName || meta.longName || symbolUpper,
      sector: meta.sector || "不明",
      industry: meta.industry || "不明",
      marketCap: meta.marketCap || null,
      regularMarketPrice: meta.regularMarketPrice || meta.chartPreviousClose,
      regularMarketChange: meta.regularMarketPrice && meta.chartPreviousClose ? (meta.regularMarketPrice - meta.chartPreviousClose) : 0,
      regularMarketChangePercent: meta.chartPreviousClose ? ((meta.regularMarketPrice - meta.chartPreviousClose) / meta.chartPreviousClose) : 0,
      regularMarketPreviousClose: meta.chartPreviousClose || meta.previousClose,
      regularMarketOpen: meta.open || meta.chartPreviousClose,
      regularMarketDayHigh: meta.regularMarketDayHigh || meta.dayHigh || meta.regularMarketPrice,
      regularMarketDayLow: meta.regularMarketDayLow || meta.dayLow || meta.regularMarketPrice,
      regularMarketVolume: meta.regularMarketVolume || meta.volume || 0,
      currency: meta.currency || "USD",
      exchange: meta.exchangeName || meta.exchange || "不明",
      quoteType: meta.instrumentType || "EQUITY",
      // 52週間の高値・安値
      fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh || null,
      fiftyTwoWeekLow: meta.fiftyTwoWeekLow || null,
      // 日付・時刻情報
      marketTime: marketTime.toISOString(),
      marketTimeFormatted: marketTime.toLocaleString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Tokyo'
      }),
      previousCloseTime: null,
      previousCloseTimeFormatted: null,
      marketState: meta.marketState || "不明",
      timezone: meta.timezone || "UTC",
      gmtoffset: meta.gmtoffset || 0,
      // チャートデータ
      chartData: chartData,
    };

    return Response.json(stockInfo);
  } catch (error) {
    return Response.json({ error: "Failed to fetch stock information" }, { status: 500 });
  }
}
