import React, { useState } from 'react';
import Plot from 'react-plotly.js';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';

const formatPercentage = (value) => {
  if (value === null || value === undefined) return 'N/A';
  return `${(value * 100).toFixed(2)}%`;
};

const formatCurrency = (value) => {
  if (value === null || value === undefined) return 'N/A';
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatNumber = (value) => {
  if (value === null || value === undefined) return 'N/A';
  return value.toFixed(2);
};

// 計算 Sharpe Ratio 的函數
const calculateSharpeRatio = (performanceData, riskFreeRate = 0.02) => {
  if (!performanceData || !performanceData.values || performanceData.values.length < 2) {
    return null;
  }

  const values = performanceData.values;
  const returns = [];
  
  // 計算日報酬率
  for (let i = 1; i < values.length; i++) {
    const dailyReturn = (values[i] - values[i-1]) / values[i-1];
    returns.push(dailyReturn);
  }
  
  if (returns.length === 0) return null;
  
  // 計算平均日報酬率
  const meanDailyReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
  
  // 計算報酬率的標準差 (日波動率)
  const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - meanDailyReturn, 2), 0) / returns.length;
  const dailyVolatility = Math.sqrt(variance);
  
  if (dailyVolatility === 0) return null;
  
  // 將年化無風險利率轉換為日無風險利率
  const dailyRiskFreeRate = Math.pow(1 + riskFreeRate, 1/252) - 1; // 假設 252 個交易日
  
  // 計算 Sharpe Ratio
  const sharpeRatio = (meanDailyReturn - dailyRiskFreeRate) / dailyVolatility * Math.sqrt(252);
  
  return sharpeRatio;
};

const ResultsDisplay = ({ results }) => {
  const [isLogScale, setIsLogScale] = useState(false);

  if (!results) {
    return <Typography>No backtest results available.</Typography>;
  }

  const { portfolio_performance, benchmark_performance } = results;

  const plotData = [];
  let plotLayout = {
    title: 'Portfolio Value',
    xaxis: { 
      title: 'Date',
    },
    yaxis: { 
      title: 'Value', 
      autorange: true,
      type: isLogScale ? 'log' : 'linear',
      tickformat: isLogScale ? '$~s' : '$,.0f',
      showexponent: 'none',
      separatethousands: true,
      gridcolor: '#e0e0e0',
      tickfont: {
        size: 11
      },
      tickprefix: '',
      hoverformat: '$,.2f',
      dtick: isLogScale ? 'D2' : null,
      tickmode: isLogScale ? 'linear' : 'auto'
    },
    autosize: true,
    margin: { t: 30, r: 10, l: 70, b: 30 },
    showlegend: true,
    legend: { 
      orientation: 'h',
      y: -0.12,
      x: 0.5,
      xanchor: 'center'
    },
    plot_bgcolor: '#ffffff',
    paper_bgcolor: '#ffffff',
    grid: {
      rows: 1,
      columns: 1,
      pattern: 'independent'
    }
  };

  let firstDate = null;
  let lastDate = null;

  if (portfolio_performance && portfolio_performance.dates && portfolio_performance.dates.length > 0) {
    plotData.push({
      x: portfolio_performance.dates,
      y: portfolio_performance.values,
      type: 'scatter',
      mode: 'lines',
      name: 'Portfolio',
    });
    firstDate = portfolio_performance.dates[0];
    lastDate = portfolio_performance.dates[portfolio_performance.dates.length - 1];
  }

  if (benchmark_performance && benchmark_performance.dates && benchmark_performance.dates.length > 0) {
    plotData.push({
      x: benchmark_performance.dates,
      y: benchmark_performance.values,
      type: 'scatter',
      mode: 'lines',
      name: 'Benchmark',
      line: { dash: 'dot' }
    });
    plotLayout.title = 'Portfolio vs Benchmark Value';
    if (lastDate === null || (benchmark_performance.dates.length > 0 && benchmark_performance.dates[benchmark_performance.dates.length - 1] > lastDate)) {
      lastDate = benchmark_performance.dates[benchmark_performance.dates.length - 1];
    }
    if (firstDate === null && benchmark_performance.dates.length > 0) {
        firstDate = benchmark_performance.dates[0];
    }
  }

  // 如果有有效的日期範圍，則設定 xaxis.range
  if (firstDate && lastDate) {
    plotLayout.xaxis.range = [firstDate, lastDate];
    plotLayout.xaxis.autorange = false; // 關閉自動範圍以使用我們的設定
  }
  
  const renderPerformanceCard = (title, performanceData) => {
    if (!performanceData) return null;
    
    const calculatedSharpeRatio = calculateSharpeRatio(performanceData);
    const sharpeRatio = performanceData.sharpe_ratio || calculatedSharpeRatio;
    
    return (
      <Grid item xs={12} sm={benchmark_performance ? 6 : 12}>
        <Box>
          <Typography variant="subtitle1" gutterBottom>{title}</Typography>
          <List dense>
            <ListItem>
              <ListItemText 
                primary="Final Value" 
                secondary={formatCurrency(performanceData.final_value || performanceData.values?.[performanceData.values.length - 1])} 
              />
            </ListItem>
            <ListItem>
              <ListItemText primary="Total Return" secondary={formatPercentage(performanceData.total_return)} />
            </ListItem>
            <ListItem>
              <ListItemText primary="Annualized Return" secondary={formatPercentage(performanceData.annualized_return)} />
            </ListItem>
            <ListItem>
              <ListItemText primary="Maximum Drawdown" secondary={formatPercentage(performanceData.max_drawdown)} />
            </ListItem>
            <ListItem>
              <ListItemText 
                primary="Sharpe Ratio" 
                secondary={formatNumber(sharpeRatio)} 
              />
            </ListItem>
          </List>
        </Box>
      </Grid>
    );
  }

  return (
    <Box sx={{ 
      display: 'flex',
      flexDirection: 'column',
      gap: 1
    }}>
      {plotData.length > 0 && (
        <Box>
          <Box sx={{ 
            height: '500px',
            position: 'relative'
          }}>
            <Plot 
              data={plotData} 
              layout={plotLayout}
              style={{ width: '100%', height: '100%' }}
              useResizeHandler={true}
              config={{ 
                responsive: true,
                displayModeBar: false
              }}
            />
            <Box sx={{
              position: 'absolute',
              bottom: '15px',
              left: '15px',
              display: 'flex',
              alignItems: 'center'
            }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={isLogScale}
                    onChange={(e) => setIsLogScale(e.target.checked)}
                    color="primary"
                    size="small"
                  />
                }
                label={
                  <Typography sx={{ 
                    fontSize: '13px',
                    fontWeight: 400,
                    color: '#2f2f2f',
                    ml: -0.5
                  }}>
                    Log Scale
                  </Typography>
                }
                sx={{
                  margin: 0,
                  '& .MuiSwitch-root': {
                    marginRight: '4px',
                    transform: 'scale(1)'
                  }
                }}
              />
            </Box>
          </Box>
        </Box>
      )}

      <Grid container spacing={1} sx={{ flex: 1 }}>
        {portfolio_performance && renderPerformanceCard('Portfolio', portfolio_performance)}
        {benchmark_performance && renderPerformanceCard('Benchmark', benchmark_performance)}
      </Grid>
      
      {/* TODO: (初期可選) 個別資產表現列表 */}
    </Box>
  );
};

export default ResultsDisplay; 