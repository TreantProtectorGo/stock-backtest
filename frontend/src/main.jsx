import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'; // 移除了 V3 後綴
// 如果您選擇了不同的 date-fns 版本或 date-fns-jalali 等，請調整 import
// import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'; // 如果選擇 Day.js
// import ja from 'date-fns/locale/ja'; // 範例：引入日文語言包
// import zhCN from 'date-fns/locale/zh-CN'; // 範例：引入簡體中文語言包
// 根據您的需求，可以不傳入 locale 使其使用瀏覽器默認或 date-fns 默認 (通常是英文)

// 建立一個基礎的 Material 3 風格主題 (MUI v5+ 預設接近 Material 3)
const theme = createTheme({
  palette: {
    mode: 'light', // 可以是 'light' 或 'dark'
    // 您可以在這裡進一步自訂主題顏色
    // primary: {
    //   main: '#yourColor',
    // },
    // secondary: {
    //   main: '#yourOtherColor',
    // },
  },
  // 您可以在這裡添加 Material 3 特有的配置，如果 MUI 預設不完全符合
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <LocalizationProvider dateAdapter={AdapterDateFns} /* adapterLocale={zhCN} */ > 
        {/* 
          如果您需要特定語言，取消註釋 adapterLocale 並傳入對應的 locale object。
          例如，對於繁體中文，date-fns 可能沒有直接的 'zh-TW'，
          但 'zh-CN' 或不指定 (依賴瀏覽器) 通常能良好運作。
          如果 date-fns v3 中 locale 路徑有變，請參考 date-fns 文件。
          例如：import { zhTW } from 'date-fns/locale/zh-TW';
          然後使用 adapterLocale={zhTW}
        */}
        <CssBaseline />
        <App />
      </LocalizationProvider>
    </ThemeProvider>
  </React.StrictMode>,
)
