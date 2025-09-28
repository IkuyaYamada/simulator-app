import type { ActionFunctionArgs } from "react-router";

// 株価データを取得・保存するAPIエンドポイント
export async function action({ request, context }: ActionFunctionArgs) {
  if (request.method === "POST") {
    return fetchAndSaveStockData(request, context);
  } else {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }
}

async function fetchAndSaveStockData(request: Request, context: any) {
  try {
    console.log('fetchAndSaveStockData called');
    const { symbol } = await request.json() as { symbol: string };
    console.log('Symbol received:', symbol);

    if (!symbol) {
      return Response.json({
        error: "Symbol is required"
      }, { status: 400 });
    }

    // データベースでは4桁の整数をそのまま使用
    const normalizedSymbol = symbol.toUpperCase();
    console.log(`Processing symbol: ${symbol} -> ${normalizedSymbol}`);

    const db = context.cloudflare.env.simulator_app_db;

    // 1. 既存の株価データをチェック
    const existingPrices = await db
      .prepare(`
        SELECT COUNT(*) as count
        FROM stock_prices 
        WHERE symbol = ?
      `)
      .bind(normalizedSymbol)
      .first();

    if (existingPrices && existingPrices.count > 0) {
      return Response.json({
        success: true,
        message: "Stock data already exists in database",
        symbol: normalizedSymbol
      });
    }

    // 2. 外部APIから株価情報を取得
    const baseUrl = new URL(request.url).origin;
    const stockInfoUrl = `${baseUrl}/api/stock-info?symbol=${normalizedSymbol}`;
    console.log('Calling stock-info API:', stockInfoUrl);
    const stockInfoResponse = await fetch(stockInfoUrl);
    
    if (!stockInfoResponse.ok) {
      const errorText = await stockInfoResponse.text();
      console.error(`Stock info API error: ${stockInfoResponse.status}`, errorText);
      throw new Error(`Failed to fetch stock info: ${stockInfoResponse.status} - ${errorText}`);
    }

    let stockInfo;
    try {
      stockInfo = await stockInfoResponse.json() as {
      longName?: string;
      shortName?: string;
      sector?: string;
      industry?: string;
      chartData?: Array<{
        date?: string;
        fullDate?: string;
        open: number;
        close: number;
        high: number;
        low: number;
        volume?: number;
      }>;
    };
    } catch (jsonError) {
      console.error('JSON parsing error:', jsonError);
      throw new Error(`Failed to parse stock info response: ${jsonError}`);
    }

    // 3. stocksテーブルにレコードが存在するかチェックし、存在しない場合は作成
    const existingStock = await db
      .prepare(`
        SELECT symbol FROM stocks WHERE symbol = ?
      `)
      .bind(normalizedSymbol)
      .first();

    if (!existingStock) {
      // stocksテーブルにレコードを作成
      const finalCompanyName = stockInfo.longName || stockInfo.shortName || normalizedSymbol;
      await db.prepare(`
        INSERT INTO stocks (symbol, name, sector, industry)
        VALUES (?, ?, ?, ?)
      `).bind(
        normalizedSymbol,
        finalCompanyName,
        stockInfo.sector || "不明",
        stockInfo.industry || "不明"
      ).run();
      console.log(`Created stock record for ${normalizedSymbol}`);
    }

    // 4. 株価データをデータベースに保存
    if (stockInfo.chartData && stockInfo.chartData.length > 0) {
      const insertValues: Array<any> = [];
      
      for (const price of stockInfo.chartData) {
        const date = price.date || price.fullDate;
        if (!date) continue;
        
        const priceDate = new Date(date);
        if (isNaN(priceDate.getTime())) continue;
        
        // 日付の妥当性チェック
        const currentYear = new Date().getFullYear();
        const dataYear = priceDate.getFullYear();
        
        if (dataYear < 2000 || dataYear > currentYear + 5) {
          continue;
        }
        
        // 価格データのバリデーション
        if (
          !price.open || isNaN(price.open) || !price.close || isNaN(price.close) ||
          !price.high || isNaN(price.high) || !price.low || isNaN(price.low)
        ) continue;
        
        // 価格データの論理的妥当性チェック
        if (
          price.open <= 0 || price.close <= 0 || price.high <= 0 || price.low <= 0 ||
          price.high < Math.max(price.open, price.close) || 
          price.low > Math.min(price.open, price.close)
        ) {
          continue;
        }

        const stockPriceId = crypto.randomUUID();
        const formattedDate = priceDate.toISOString().split('T')[0];
          
        insertValues.push(
          stockPriceId,
          normalizedSymbol,
          formattedDate,
          Number(price.open).toFixed(2),
          Number(price.close).toFixed(2),
          Number(price.high).toFixed(2),
          Number(price.low).toFixed(2),
          price.volume || 0,
          new Date().toISOString()
        );
      }

      if (insertValues.length > 0) {
        const insertQuery = `
          INSERT OR REPLACE INTO stock_prices (
            stock_price_id, symbol, price_date, open_price, 
            close_price, high_price, low_price, volume, last_updated
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
         
        let insertedCount = 0;
        for (let i = 0; i < insertValues.length; i += 9) {
          const args = insertValues.slice(i, i + 9);
          try {
            await db.prepare(insertQuery).bind(...args).run();
            insertedCount++;
          } catch (error) {
            console.error(`Failed to insert price record ${i/9 + 1}:`, error);
          }
        }

        return Response.json({
          success: true,
          symbol: normalizedSymbol,
          insertedCount,
          totalProcessed: stockInfo.chartData.length
        });
      }
    }

    return Response.json({
      success: false,
      message: "No valid chart data found"
    });

  } catch (error) {
    console.error("Stock data fetch and save error:", error);
    return Response.json({
      error: "Failed to fetch and save stock data"
    }, { status: 500 });
  }
}
