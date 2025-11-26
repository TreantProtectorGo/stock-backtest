from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, validator
from typing import List, Optional, Dict, Any
import yfinance as yf
import pandas as pd
from datetime import date
from thestrat import get_multi_timeframe_data

app = FastAPI()

# --- CORS 設定 ---
origins = [
    "http://localhost",         # Vite 預設 (如果沒指定 port)
    "http://localhost:3000",    # 常見 Create React App 預設 port
    "http://localhost:5173",    # Vite 預設 port
    "http://127.0.0.1:5173",  # 有時瀏覽器會解析為 127.0.0.1
    "http://127.0.0.1:3000",
    # 如果您使用其他 port，請加入
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,  # 允許指定的來源
    allow_credentials=True, # 允許 cookies (如果您的 API 需要)
    allow_methods=["*"],    # 允許所有 HTTP 方法
    allow_headers=["*"],    # 允許所有 HTTP 標頭
)

# --- API Request Models ---
class AssetInput(BaseModel):
    ticker: str = Field(..., description="股票代號")
    weight: float = Field(..., gt=0, le=1, description="資產權重，必須大於0且小於等於1")

class PortfolioBacktestRequest(BaseModel):
    assets: List[AssetInput] = Field(..., min_items=1, description="資產列表")
    initial_investment: float = Field(10000.0, gt=0, description="初始投資金額")
    start_date: date = Field(..., description="回測開始日期")
    end_date: date = Field(..., description="回測結束日期")
    benchmark_ticker: Optional[str] = Field(None, description="市場基準股票代號 (可選)")
    rebalance: Optional[str] = Field(None, description="再平衡頻率 (None, Monthly, Quarterly, Annually)")

    @validator('assets')
    def weights_must_sum_to_one(cls, v):
        total_weight = sum(asset.weight for asset in v)
        if not (0.9999 < total_weight < 1.0001):
            raise ValueError("資產權重總和必須接近 1")
        return v

    @validator('end_date')
    def end_date_must_be_after_start_date(cls, v, values):
        if 'start_date' in values and v <= values['start_date']:
            raise ValueError("結束日期必須晚於開始日期")
        return v

# --- API Response Models ---
class PerformanceMetrics(BaseModel):
    dates: List[date]
    values: List[float]
    total_return: float
    annualized_return: float
    max_drawdown: float
    final_value: Optional[float] = None # 新增
    sharpe_ratio: Optional[float] = None # 新增

class PortfolioBacktestResponse(BaseModel):
    portfolio_performance: PerformanceMetrics
    benchmark_performance: Optional[PerformanceMetrics] = None
    # summary_message: str # 已移除

# --- Helper Functions ---
def get_stock_data(tickers: List[str], start_date: date, end_date: date) -> pd.DataFrame:
    """
    使用 yfinance 獲取指定股票代號在指定期間內的每日調整後收盤價。
    由於 yfinance auto_adjust 預設為 True，我們主要獲取 'Close' 欄位，它已是調整後價格。
    """
    try:
        # auto_adjust 預設為 True，會自動調整 OHLC 價格並移除 'Adj Close'
        downloaded_data = yf.download(tickers, start=start_date, end=end_date, progress=False, auto_adjust=True)
        
        # DEBUG prints (可以保留用於進一步調試，或在確認功能後移除)
        print(f"DEBUG (auto_adjust=True): Downloaded data for {tickers} head:\n{downloaded_data.head()}")
        print(f"DEBUG (auto_adjust=True): Downloaded data columns: {downloaded_data.columns}")
        if isinstance(downloaded_data.columns, pd.MultiIndex):
            print(f"DEBUG (auto_adjust=True): MultiIndex levels: {downloaded_data.columns.levels}")
            if downloaded_data.columns.levels:
                 print(f"DEBUG (auto_adjust=True): MultiIndex level 0: {downloaded_data.columns.levels[0]}")

        if downloaded_data.empty:
            error_message = f"無法為股票列表 {tickers} 在指定期間獲取任何數據 (auto_adjust=True)。"
            if len(tickers) == 1:
                error_message = f"無法為股票 {tickers[0]} 在指定期間獲取任何數據 (auto_adjust=True)。請檢查股票代號和日期。"
            raise ValueError(error_message)

        price_field_to_use = 'Close' # 因為 auto_adjust=True，'Close' 就是調整後的價格

        if isinstance(downloaded_data.columns, pd.MultiIndex):
            # 預期結構是 (PriceField, Ticker)，例如 ('Close', 'AAPL')
            # PriceField 在 levels[0], Ticker 在 levels[1]
            if price_field_to_use not in downloaded_data.columns.levels[0]:
                available_levels = downloaded_data.columns.levels[0] if downloaded_data.columns.levels else 'N/A'
                raise ValueError(f"下載的數據中缺少 '{price_field_to_use}' 欄位 (MultiIndex). 股票: {tickers}. 可用頂層欄位: {available_levels}")
            
            # 選取所有 tickers 的 'Close' 數據
            selected_data = downloaded_data[price_field_to_use]
            # 此時 selected_data 的列應該直接是 tickers (AAPL, SPY)
        elif price_field_to_use in downloaded_data.columns: # 單一 ticker
            if len(tickers) == 1:
                # 對於單一 ticker，yf.download(auto_adjust=True) 返回的 DataFrame 列可能直接是 OHLCV
                # 我們只需要 'Close' 列，並將其重命名為 ticker 名稱
                selected_data = downloaded_data[[price_field_to_use]].rename(columns={price_field_to_use: tickers[0]})
            else:
                # 這種情況理論上不應發生，因為多 tickers 應該是 MultiIndex
                # 但以防萬一，如果不是 MultiIndex 卻有多個 ticker 且有 'Close'
                raise ValueError("多股票數據未以預期的 MultiIndex 格式返回。")
        else: # 數據格式不符合預期
            cols_repr = downloaded_data.columns
            if hasattr(cols_repr, 'tolist'): cols_repr = cols_repr.tolist()
            raise ValueError(f"下載的數據格式不正確或缺少 '{price_field_to_use}' 欄位. 股票: {tickers}, 可用欄位: {cols_repr}")
        
        if selected_data.empty:
             raise ValueError(f"成功下載數據但提取 '{price_field_to_use}' 後為空. 股票: {tickers}")
        
        # 確保返回的 DataFrame 的列名是 tickers
        # selected_data 在 MultiIndex 情況下，列名應該已經是 tickers
        # 在單一 ticker 情況下，我們已經重命名了
        
        # 檢查是否有請求的 ticker 在 selected_data 中缺失 (yfinance 可能對無效 ticker 不返回列)
        missing_tickers = [t for t in tickers if t not in selected_data.columns]
        if missing_tickers:
            # 可以選擇為缺失的 ticker 填充 NaN，或直接報錯
            # print(f"WARNING: Data for tickers {missing_tickers} not found in downloaded data. Filling with NaN.")
            # for t in missing_tickers:
            #     selected_data[t] = pd.NA
            raise ValueError(f"未能獲取股票 {missing_tickers} 的 '{price_field_to_use}' 數據。可用股票: {selected_data.columns.tolist()}")

        # 如果只想返回請求的 tickers 數據 (以防 yfinance 返回了額外的)
        # 並確保順序與請求一致
        final_data = selected_data[tickers]

        return final_data

    except KeyError as ke:
        raise HTTPException(status_code=500, detail=f"處理股價數據時發生鍵錯誤: {str(ke)}. 股票: {tickers}")
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        error_type = type(e).__name__
        raise HTTPException(status_code=500, detail=f"獲取股價數據 ({tickers}) 時發生 {error_type} 錯誤: {str(e)}")

def calculate_performance(
    prices_df: pd.DataFrame, 
    initial_investment: float, 
    weights: Optional[Dict[str, float]] = None,
    rebalance: Optional[str] = None,
    risk_free_rate: float = 0.02 # 無風險利率，用於 Sharpe Ratio 計算
) -> PerformanceMetrics:
    if prices_df.empty:
        return PerformanceMetrics(dates=[], values=[], total_return=0.0, annualized_return=0.0, max_drawdown=0.0, final_value=initial_investment, sharpe_ratio=None)

    # 1. 確定共同的有效起始日期 (在任何填充之前)
    first_valid_date_global = None
    if not prices_df.empty:
        first_valid_dates_per_ticker = prices_df.apply(lambda series: series.first_valid_index())
        if first_valid_dates_per_ticker.isnull().any():
            tickers_with_no_data = first_valid_dates_per_ticker[first_valid_dates_per_ticker.isnull()].index.tolist()
            print(f"WARNING: The following tickers have no valid data in the entire selected period: {tickers_with_no_data}. Cannot start backtest.")
            # 返回一個表示錯誤或無效回測的 PerformanceMetrics
            return PerformanceMetrics(dates=[], values=[], total_return=0.0, annualized_return=0.0, max_drawdown=0.0, final_value=initial_investment, sharpe_ratio=None)
        elif not first_valid_dates_per_ticker.empty:
            first_valid_date_global = first_valid_dates_per_ticker.max()
            if pd.isna(first_valid_date_global): # 理論上不會到這裡，因為上面檢查了 isnull().any()
                print("WARNING: Could not determine a common start date. Cannot start backtest.")
                return PerformanceMetrics(dates=[], values=[], total_return=0.0, annualized_return=0.0, max_drawdown=0.0, final_value=initial_investment, sharpe_ratio=None)
    else:
        # prices_df 為空，直接返回
        return PerformanceMetrics(dates=[], values=[], total_return=0.0, annualized_return=0.0, max_drawdown=0.0, final_value=initial_investment, sharpe_ratio=None)

    # 2. 從共同起始日切片，然後填充 NaN
    if first_valid_date_global is None or first_valid_date_global not in prices_df.index:
         print(f"WARNING: Calculated common_start_date ({first_valid_date_global}) is invalid or not in index. Cannot proceed.")
         return PerformanceMetrics(dates=[], values=[], total_return=0.0, annualized_return=0.0, max_drawdown=0.0, final_value=initial_investment, sharpe_ratio=None)

    prices_df_sliced = prices_df.loc[first_valid_date_global:]
    print(f"INFO: Actual backtest calculation starting from {first_valid_date_global.strftime('%Y-%m-%d')} "
          f"as it's the first date all selected tickers have data.")
    
    prices_df_filled = prices_df_sliced.ffill().bfill()

    # 3. 檢查填充後是否仍然完全是 NaN (不太可能，除非切片後的數據有問題)
    if prices_df_filled.isnull().all().all():
        print(f"WARNING: Data for all tickers is still NaN after slicing from common start date {first_valid_date_global.strftime('%Y-%m-%d')} and filling.")
        dates_list = prices_df_sliced.index.strftime('%Y-%m-%d').tolist() if not prices_df_sliced.empty else []
        return PerformanceMetrics(dates=dates_list, values=[initial_investment]*len(dates_list), total_return=0.0, annualized_return=0.0, max_drawdown=0.0, final_value=initial_investment, sharpe_ratio=None)

    # --- 後續計算邏輯 (portfolio_values_series, metrics) 將使用調整後的 prices_df_filled ---
    portfolio_values_series = pd.Series(dtype=float)

    if weights: # 計算投資組合
        portfolio_value_current = initial_investment
        portfolio_values_over_time = [] 
        
        current_shares = {}
        # 初始股數計算基於 *新的* 起始日 (prices_df_filled.index[0] 現在是共同起始日)
        for ticker, weight in weights.items():
            if ticker in prices_df_filled.columns and prices_df_filled[ticker].iloc[0] != 0:
                current_shares[ticker] = (initial_investment * weight) / prices_df_filled[ticker].iloc[0]
            else:
                current_shares[ticker] = 0 
        
        rebalance_schedule = []
        if rebalance:
            freq_map = {"Monthly": "BME", "Quarterly": "BQE", "Annually": "BYE"}
            if rebalance in freq_map:
                # 再平衡日期也應該在新的 prices_df_filled 的範圍內生成
                if not prices_df_filled.empty:
                    rebalance_schedule_ideal = pd.date_range(
                        start=prices_df_filled.index[0], # 使用調整後的起始日
                        end=prices_df_filled.index[-1], 
                        freq=freq_map[rebalance]
                    )
                    # print(f"DEBUG: Ideal {rebalance} rebalance dates: {rebalance_schedule_ideal.strftime('%Y-%m-%d').tolist()}")
                    rebalance_schedule = [d for d in rebalance_schedule_ideal if d in prices_df_filled.index]
                    # print(f"DEBUG: Actual {rebalance} rebalance dates (in trade days): {pd.Series(rebalance_schedule).dt.strftime('%Y-%m-%d').tolist()}")
                    rebalance_schedule = sorted(list(set(rebalance_schedule)))

        # 每日循環遍歷調整後的 prices_df_filled
        for i, day in enumerate(prices_df_filled.index):
            daily_portfolio_value = 0
            for ticker in weights.keys():
                if ticker in current_shares and ticker in prices_df_filled.columns:
                    daily_portfolio_value += current_shares[ticker] * prices_df_filled.loc[day, ticker]
            
            portfolio_values_over_time.append(daily_portfolio_value)
            portfolio_value_current = daily_portfolio_value 

            # if day in rebalance_schedule:
            #      print(f"DEBUG: Matched rebalance date: {day.strftime('%Y-%m-%d')}")

            if rebalance and day in rebalance_schedule and i < len(prices_df_filled.index) - 1:
                # print(f"DEBUG: Rebalancing on {day.strftime('%Y-%m-%d')}. Portfolio value: {portfolio_value_current:.2f}")
                for ticker, weight in weights.items():
                    if ticker in prices_df_filled.columns and prices_df_filled.loc[day, ticker] != 0:
                        current_shares[ticker] = (portfolio_value_current * weight) / prices_df_filled.loc[day, ticker]
                    else:
                        current_shares[ticker] = 0
        
        if not portfolio_values_over_time:
             portfolio_values_series = pd.Series([initial_investment] * len(prices_df_filled.index), index=prices_df_filled.index)
        else:
            portfolio_values_series = pd.Series(portfolio_values_over_time, index=prices_df_filled.index)

    else: # 計算單一資產 (通常是基準)
        first_price = prices_df_filled.iloc[0, 0] if not prices_df_filled.empty else 0
        if first_price == 0:
            portfolio_values_series = pd.Series([initial_investment] * len(prices_df_filled.index), index=prices_df_filled.index)
        else:
            normalized_prices = prices_df_filled.iloc[:, 0] / first_price
            portfolio_values_series = normalized_prices * initial_investment
    
    # 如果在所有處理之後，portfolio_values_series 仍然有問題
    if portfolio_values_series.empty or portfolio_values_series.isnull().all():
        # ... (這部分邏輯與上面 prices_df_processed.empty 的處理類似，可能需要合併或確保一致性)
        # 這裡我們假設如果能到這一步，prices_df_filled 是有數據的
        dates_list = prices_df_filled.index.strftime('%Y-%m-%d').tolist() if not prices_df_filled.empty else []
        values_list = [initial_investment] * len(dates_list) # 初始值列表
        return PerformanceMetrics(
            dates=dates_list, 
            values=values_list, 
            total_return=0.0, 
            annualized_return=0.0, 
            max_drawdown=0.0,
            final_value=initial_investment,
            sharpe_ratio=None
        )
        
    # --- 計算績效指標 (使用調整後的 portfolio_values_series 和 initial_investment) ---
    final_value_calc = portfolio_values_series.iloc[-1]
    # 總報酬率基於 *實際使用的* 投資組合序列的第一個值和最後一個值
    # initial_value_for_calc = portfolio_values_series.iloc[0]
    # total_return_calc = (final_value_calc / initial_value_for_calc) - 1 if initial_value_for_calc != 0 else 0
    # 或者，更標準的是基於最初的 initial_investment，因為我們是從共同日期開始以 initial_investment 投入
    total_return_calc = (final_value_calc / initial_investment) - 1

    # 持有天數基於調整後的序列長度
    days_held = (prices_df_filled.index[-1] - prices_df_filled.index[0]).days if not prices_df_filled.empty else 0
    if days_held < 1: # 如果持有期小於1天 (例如開始結束同天)
        annualized_return_calc = total_return_calc # 年化報酬等於總報酬
    else:
        annualized_return_calc = ( (1 + total_return_calc) ** (365.0 / days_held) ) - 1

    cumulative_returns = portfolio_values_series / initial_investment
    peak = cumulative_returns.cummax()
    drawdown = (cumulative_returns - peak) / peak
    max_drawdown_calc = drawdown.min()
    if pd.isna(max_drawdown_calc): max_drawdown_calc = 0.0


    # 計算 Sharpe Ratio
    sharpe_ratio_calc = None
    if len(portfolio_values_series) > 1:
        daily_returns = portfolio_values_series.pct_change().dropna()
        if not daily_returns.empty:
            mean_daily_return = daily_returns.mean()
            std_daily_return = daily_returns.std()
            if std_daily_return != 0 and not pd.isna(std_daily_return):
                # 將年化無風險利率轉換為日無風險利率
                daily_risk_free_rate = (1 + risk_free_rate)**(1/252) - 1
                sharpe_ratio_calc = (mean_daily_return - daily_risk_free_rate) / std_daily_return * (252**0.5)
    
    return PerformanceMetrics(
        dates=portfolio_values_series.index.strftime('%Y-%m-%d').tolist(),
        values=portfolio_values_series.round(2).tolist(),
        total_return=round(total_return_calc, 4),
        annualized_return=round(annualized_return_calc, 4),
        max_drawdown=round(max_drawdown_calc, 4),
        final_value=round(final_value_calc, 2),
        sharpe_ratio=round(sharpe_ratio_calc, 2) if sharpe_ratio_calc is not None else None
    )

# --- API Endpoint ---
@app.post("/api/backtest/portfolio_buy_and_hold", response_model=PortfolioBacktestResponse)
async def portfolio_buy_and_hold_backtest(request: PortfolioBacktestRequest):
    print(f"DEBUG: Received rebalance request: {request.rebalance}") # 調試輸出
    all_tickers = list(set([asset.ticker for asset in request.assets] + ([request.benchmark_ticker] if request.benchmark_ticker else [])))

    try:
        stock_data = get_stock_data(all_tickers, request.start_date, request.end_date)
    except HTTPException as e:
        raise e
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        error_type = type(e).__name__
        raise HTTPException(status_code=500, detail=f"獲取股價數據時發生 {error_type} 意外錯誤: {str(e)}")

    if stock_data.empty:
        raise HTTPException(status_code=400, detail="無法獲取任何請求股票的數據")

    portfolio_tickers = [asset.ticker for asset in request.assets]
    portfolio_weights = {asset.ticker: asset.weight for asset in request.assets}
    
    missing_portfolio_tickers = [pt for pt in portfolio_tickers if pt not in stock_data.columns]
    if missing_portfolio_tickers:
        raise HTTPException(status_code=400, detail=f"Portfolio tickers {missing_portfolio_tickers} not found in downloaded data. Available: {stock_data.columns.tolist()}")

    portfolio_prices = stock_data[portfolio_tickers].copy() # 使用 .copy() 避免 SettingWithCopyWarning

    portfolio_performance_metrics = calculate_performance(
        prices_df=portfolio_prices,
        initial_investment=request.initial_investment,
        weights=portfolio_weights,
        rebalance=request.rebalance
    )

    benchmark_performance_metrics = None
    if request.benchmark_ticker:
        if request.benchmark_ticker not in stock_data.columns:
             # 如果基準 ticker 數據缺失，可以選擇跳過基準計算或報錯
             # 這裡選擇不報錯，benchmark_performance_metrics 將保持為 None
             print(f"Warning: Benchmark ticker {request.benchmark_ticker} not found in downloaded data. Skipping benchmark calculation.")
        else:
            benchmark_prices = stock_data[[request.benchmark_ticker]].copy() # 使用 .copy()
            benchmark_performance_metrics = calculate_performance(
                prices_df=benchmark_prices,
                initial_investment=request.initial_investment
            )
    
    return PortfolioBacktestResponse(
        portfolio_performance=portfolio_performance_metrics,
        benchmark_performance=benchmark_performance_metrics
    )


# --- TheStrat Multi-Timeframe Endpoint ---
class TheStratRequest(BaseModel):
    ticker: str = Field(..., description="Stock ticker symbol")
    start_date: date = Field(..., description="Start date for analysis")
    end_date: date = Field(..., description="End date for analysis")
    timeframes: Optional[List[str]] = Field(
        None, 
        description="List of timeframes (e.g., ['2d', '3d', '10d', '2w', '5w', '10w'])"
    )

    @validator('end_date')
    def end_date_must_be_after_start_date(cls, v, values):
        if 'start_date' in values and v <= values['start_date']:
            raise ValueError("End date must be after start date")
        return v


@app.post("/api/thestrat")
async def analyze_thestrat(request: TheStratRequest) -> Dict[str, Any]:
    """
    Analyze stock using TheStrat methodology with multiple timeframes.
    Returns OHLCV data and pattern detection for each timeframe.
    """
    try:
        result = get_multi_timeframe_data(
            ticker=request.ticker,
            start_date=str(request.start_date),
            end_date=str(request.end_date),
            timeframes=request.timeframes
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


# 如果你想直接運行這個 FastAPI 應用 (例如使用 uvicorn main:app --reload)
# if __name__ == "__main__":
#     import uvicorn
#     uvicorn.run(app, host="0.0.0.0", port=8000) 