import axios from 'axios';

// Vite 使用 import.meta.env.VITE_API_URL。
// 您可以在專案根目錄的 .env 檔案中設定 VITE_API_URL，例如：
// VITE_API_URL=http://localhost:8000/api
// 如果未設定，則預設為本地開發 URL。
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const submitBacktest = async (formData) => {
  try {
    const response = await apiClient.post('/backtest/portfolio_buy_and_hold', formData);
    return response.data;
  } catch (error) {
    if (error.response && error.response.data && error.response.data.detail) {
      let errorMessage = error.response.data.detail;
      // 處理 Pydantic 可能返回的詳細錯誤列表
      if (Array.isArray(errorMessage)) {
        errorMessage = errorMessage.map(err => {
          const loc = err.loc && Array.isArray(err.loc) ? err.loc.join(' -> ') : 'input'; // 提供預設值
          return `${loc}: ${err.msg}`;
        }).join('; ');
      }
      throw new Error(errorMessage);
    } else if (error.request) {
      // 請求已發出，但沒有收到回應 (例如網路問題或伺服器未運行)
      throw new Error('無法連接到回測伺服器。請檢查您的網路連線並確認伺服器正在運行。');
    } else {
      // 設定請求時發生了其他問題
      throw new Error(error.message || '執行回測請求時發生未知錯誤。');
    }
  }
};