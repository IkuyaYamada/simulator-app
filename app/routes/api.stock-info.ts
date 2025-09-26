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
      const date = new Date(timestamp * 1000);
      return {
        date: date.toISOString().split('T')[0], // YYYY-MM-DD形式
        fullDate: date.toISOString().split('T')[0], // YYYY-MM-DD形式
        timestamp: timestamp,
        open: opens[index] || null,
        high: highs[index] || null,
        low: lows[index] || null,
        close: closes[index] || null,
        volume: volumes[index] || 0
      };
    });

    
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
