# Stock Backtesting System

This project is a web application for performing historical backtesting of stock portfolios. Users can configure the types of stocks in their portfolio, the weight of each stock, the initial investment amount, the start and end dates for backtesting, and select a benchmark index for performance comparison.

## Key Features

- **Portfolio Configuration:**
    - Add up to 5 stocks.
    - Set the investment weight for each stock (as a percentage).
    - Set the initial investment amount.
    - Set the start and end dates for backtesting.
- **Rebalancing Strategy:**
    - Provides multiple rebalancing frequency options (e.g., monthly, quarterly, annually, or no rebalancing).
- **Benchmark Comparison:**
    - Users can enter a benchmark ticker symbol (e.g., SPY) to compare portfolio performance against a market benchmark.
- **Backtest Execution:**
    - Click the "Start Backtest" button, and the system will submit the configuration parameters to the backend for processing.
- **Results Display:**
    - **Chart Visualization:**
        - Displays the portfolio value over time as a line chart.
        - If a benchmark is set, the chart will also show the benchmark's value changes.
        - Provides toggle functionality between linear and logarithmic (Log Scale) coordinate scales, allowing users to observe growth trends from different perspectives.
    - **Performance Metrics Cards:**
        - Displays detailed performance metrics for both the portfolio and benchmark, including:
            - Final Value
            - Total Return
            - Annualized Return
            - Maximum Drawdown
            - Sharpe Ratio

## Future Outlook

- Add individual asset performance lists within the portfolio.
- Provide more detailed transaction logs or significant event records.
- Develop more diverse rebalancing strategy options.
- Incorporate trading costs and related fees (e.g., commissions) into backtesting considerations.
- Expand risk metric calculations (e.g., Sortino Ratio, Calmar Ratio, etc.).
- Add parameter sensitivity analysis functionality.
- Develop a user account system to provide storage and query capabilities for backtesting history. 