import yfinance as yf
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional


def resample_to_custom_days(df: pd.DataFrame, days: int) -> pd.DataFrame:
    """Resample data to custom day periods (e.g., 2d, 3d, 10d)."""
    # Use label='right' and closed='right' for proper bar alignment
    df_resampled = df.resample(f'{days}D', label='right', closed='right').agg({
        'Open': 'first',
        'High': 'max',
        'Low': 'min',
        'Close': 'last',
        'Volume': 'sum'
    }).dropna()
    return df_resampled


def resample_to_custom_weeks(df: pd.DataFrame, weeks: int) -> pd.DataFrame:
    """Resample data to custom week periods (e.g., 2w, 5w, 10w)."""
    # Week ends on Friday (W-FRI), label with right edge
    df_resampled = df.resample(f'{weeks}W-FRI', label='right', closed='right').agg({
        'Open': 'first',
        'High': 'max',
        'Low': 'min',
        'Close': 'last',
        'Volume': 'sum'
    }).dropna()
    return df_resampled


def resample_to_custom_months(df: pd.DataFrame, months: int) -> pd.DataFrame:
    """Resample data to custom month periods (e.g., 1m, 3m, 6m)."""
    # Month ends on last business day
    df_resampled = df.resample(f'{months}ME', label='right', closed='right').agg({
        'Open': 'first',
        'High': 'max',
        'Low': 'min',
        'Close': 'last',
        'Volume': 'sum'
    }).dropna()
    return df_resampled


def detect_thestrat_pattern(df: pd.DataFrame) -> List[str]:
    """
    Detect TheStrat bar patterns:
    - 1: Inside bar (high <= prev high AND low >= prev low, not equal on both)
    - 2: Directional bar (normal bar)
    - 3: Outside bar (high >= prev high AND low <= prev low, not equal on both)
    - 2u: Up bar (close > prev close)
    - 2d: Down bar (close < prev close)
    """
    patterns = []
    
    for i in range(len(df)):
        if i == 0:
            patterns.append('2')  # First bar is always 2
            continue
        
        curr_high = df.iloc[i]['High']
        curr_low = df.iloc[i]['Low']
        curr_close = df.iloc[i]['Close']
        prev_high = df.iloc[i-1]['High']
        prev_low = df.iloc[i-1]['Low']
        prev_close = df.iloc[i-1]['Close']
        
        # Check for inside bar (1) - current range is within previous range
        if curr_high <= prev_high and curr_low >= prev_low:
            # Make sure it's not exactly the same (which would be rare but possible)
            if curr_high < prev_high or curr_low > prev_low:
                patterns.append('1')
            else:
                # Identical bars - treat as directional
                patterns.append('2u' if curr_close >= prev_close else '2d')
        # Check for outside bar (3) - current range engulfs previous range
        elif curr_high > prev_high and curr_low < prev_low:
            # Make sure it actually engulfs (not identical)
            if curr_high > prev_high or curr_low < prev_low:
                patterns.append('3')
            else:
                patterns.append('2u' if curr_close >= prev_close else '2d')
        # Directional bar (2) - neither inside nor outside
        else:
            if curr_close > prev_close:
                patterns.append('2u')
            elif curr_close < prev_close:
                patterns.append('2d')
            else:
                patterns.append('2')
    
    return patterns


def get_multi_timeframe_data(
    ticker: str,
    start_date: str,
    end_date: str,
    timeframes: Optional[List[str]] = None
) -> Dict[str, Any]:
    """
    Get multi-timeframe OHLCV data for TheStrat analysis.
    
    Args:
        ticker: Stock ticker symbol
        start_date: Start date in YYYY-MM-DD format
        end_date: End date in YYYY-MM-DD format
        timeframes: List of timeframes (default: ['D', 'W', 'M', '2d', '3d', '10d', '2w', '5w', '10w'])
                   Supported formats: 'D' (daily), 'W' (weekly), 'M' (monthly),
                   or custom like '2d', '3d', '10d', '2w', '5w', '10w'
    
    Returns:
        Dictionary containing data for each timeframe
    """
    if timeframes is None:
        timeframes = ['D', 'W', 'M', '2d', '3d', '10d', '2w', '5w', '10w']
    
    # Download daily data
    df_daily = yf.download(ticker, start=start_date, end=end_date, progress=False)
    
    if df_daily.empty:
        raise ValueError(f"No data found for ticker {ticker}")
    
    # Handle MultiIndex columns (when downloading single ticker, columns might still be MultiIndex)
    if isinstance(df_daily.columns, pd.MultiIndex):
        df_daily.columns = df_daily.columns.get_level_values(0)
    
    result = {}
    
    for tf in timeframes:
        # Handle standard timeframes
        if tf == 'D':
            df_tf = df_daily.copy()
        elif tf == 'W':
            df_tf = resample_to_custom_weeks(df_daily, 1)
        elif tf == 'M':
            df_tf = resample_to_custom_months(df_daily, 1)
        # Handle custom timeframes
        elif tf.endswith('d'):
            days = int(tf[:-1])
            df_tf = resample_to_custom_days(df_daily, days)
        elif tf.endswith('w'):
            weeks = int(tf[:-1])
            df_tf = resample_to_custom_weeks(df_daily, weeks)
        elif tf.endswith('m'):
            months = int(tf[:-1])
            df_tf = resample_to_custom_months(df_daily, months)
        else:
            continue
        
        # Detect patterns
        patterns = detect_thestrat_pattern(df_tf)
        
        # Convert to JSON-serializable format
        result[tf] = {
            'dates': df_tf.index.strftime('%Y-%m-%d').tolist(),
            'open': df_tf['Open'].round(2).tolist(),
            'high': df_tf['High'].round(2).tolist(),
            'low': df_tf['Low'].round(2).tolist(),
            'close': df_tf['Close'].round(2).tolist(),
            'volume': df_tf['Volume'].astype(int).tolist(),
            'patterns': patterns
        }
    
    return {
        'ticker': ticker,
        'timeframes': result
    }

