/**
 * JST（日本標準時）への変換を確実に行うユーティリティ
 * Cloudflare Workers環境やブラウザの差異に関係なく、統一されたJST変換を実現
 */

/**
 * UTC時刻をJST（UTC+9）に変換して日本語形式でフォーマット
 * @param dateString - 変換対象の日時（文字列またはDateオブジェクト）
 * @returns JST変換された日本語形式の日時文字列
 */
export const formatToJST = (dateString: string | Date): string => {
  let date: Date;
  
  if (typeof dateString === 'string') {
    date = new Date(dateString);
  } else {
    date = dateString;
  }
  
  try {
    // 標準的JST変換（timeZoneオプション使用）
    const jstString = date.toLocaleString('ja-JP', {
      year: 'numeric',
      month: 'numeric',  
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'Asia/Tokyo'
    });
    
    return jstString;
  } catch (error) {
    // フォールバック: 手動でUTC+9h計算してJST表示
    const utcMillis = date.getTime();
    const jstMillis = utcMillis + (9 * 60 * 60 * 1000); // UTC+9時間
    const jstDate = new Date(jstMillis);
    
    return jstDate.toLocaleString('ja-JP', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  }
};

/**
 * UTC時刻をJST（UTC+9）に変換して日付のみ日本語形式でフォーマット
 * @param dateString - 変換対象の日時（文字列またはDateオブジェクト）
 * @returns JST変換された日本語形式の日付文字列
 */
export const formatToJSTDateOnly = (dateString: string | Date): string => {
  const date = new Date(dateString);
  
  return date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Asia/Tokyo'
  });
};

/**
 * 通貨表示を日本語形式でフォーマット
 * @param amount - 表示する金額
 * @returns 日本語形式の通貨文字列
 */
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

/**
 * 現在時刻を取得
 * @returns 現在のJST時刻
 */
export const getCurrentJST = (): Date => {
  const now = new Date();
  // 時間計算ではなく、株価情報と同じ方法を採用
  // 直接新しいdateformatterでmatching imaplementation
  return new Date();
};
