import type { ActionFunctionArgs } from "react-router";

// 外部APIから取得した株価データをデータベースに保存
export async function action({ request, context }: ActionFunctionArgs) {
  try {
    const { symbol, prices } = await request.json() as {
      symbol: string;
      prices: Array<{
        date?: string;
        fullDate?: string;
        open: number;
        close: number;
        high: number;
        low: number;
        volume?: number;
      }>;
    };

    if (!symbol || !prices || prices.length === 0) {
      return Response.json({
        error: "Missing required fields: symbol and prices"
      }, { status: 400 });
    }

    const db = context.cloudflare.env.simulator_app_db;
    
    // pricesを挿入していく要素
    const insertValues: Array<any> = [];
    
    for (const price of prices) {
      const date = price.date || price.fullDate;
      if (!date) continue;
      
      const priceDate = new Date(date);
      if (isNaN(priceDate.getTime())) continue;
      
      // 日付の妥当性チェック
      const currentYear = new Date().getFullYear();
      const dataYear = priceDate.getFullYear();
      
      // 2000年以前または現在年より5年先のデータは無効とする
      if (dataYear < 2000 || dataYear > currentYear + 5) {
        console.warn(`Invalid date detected in stock-prices API: ${date} (year: ${dataYear})`);
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
        console.warn(`Invalid price data detected for date ${date}:`, {
          open: price.open, close: price.close, high: price.high, low: price.low
        });
        continue;
      }

      const stockPriceId = crypto.randomUUID();
      const formattedDate = priceDate.toISOString().split('T')[0]; // YYYY-MM-DD
        
      insertValues.push(
        stockPriceId,
        symbol.toUpperCase(),
        formattedDate,
        Number(price.open).toFixed(2),
        Number(price.close).toFixed(2),
        Number(price.high).toFixed(2),
        Number(price.low).toFixed(2),
        price.volume || 0,
        new Date().toISOString() // last_updated
      );
    }

    if (insertValues.length === 0) {
      return Response.json({
        error: "No valid price data to save after validation"
      }, { status: 400 });
    }


    // INSERTを実行
    // 複数INSERTなので prepareのqueryを毎回使用
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
      symbol: symbol.toUpperCase(),
      insertedCount,
      totalProcessed: prices.length
    });

  } catch (error) {
    console.error("Stock prices save error:", error);
    return Response.json({
      error: "Failed to save stock prices"
    }, { status: 500 });
  }
}



