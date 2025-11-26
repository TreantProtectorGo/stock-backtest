import React, { useState } from 'react';
import Plot from 'react-plotly.js';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';

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

// Calculate Sharpe Ratio
const calculateSharpeRatio = (performanceData, riskFreeRate = 0.02) => {
  if (!performanceData || !performanceData.values || performanceData.values.length < 2) {
    return null;
  }

  const values = performanceData.values;
  const returns = [];
  
  for (let i = 1; i < values.length; i++) {
    const dailyReturn = (values[i] - values[i-1]) / values[i-1];
    returns.push(dailyReturn);
  }
  
  if (returns.length === 0) return null;
  
  const meanDailyReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
  const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - meanDailyReturn, 2), 0) / returns.length;
  const dailyVolatility = Math.sqrt(variance);
  
  if (dailyVolatility === 0) return null;
  
  const dailyRiskFreeRate = Math.pow(1 + riskFreeRate, 1/252) - 1;
  const sharpeRatio = (meanDailyReturn - dailyRiskFreeRate) / dailyVolatility * Math.sqrt(252);
  
  return sharpeRatio;
};

// Stat Card Component
const StatCard = ({ label, value, isPercentage = false, isCurrency = false, showTrend = false }) => {
  const numValue = typeof value === 'string' ? parseFloat(value.replace(/[^0-9.-]/g, '')) : value;
  const isPositive = numValue > 0;
  const isNegative = numValue < 0;
  
  let displayValue = value;
  if (isCurrency && typeof numValue === 'number') {
    displayValue = formatCurrency(numValue);
  } else if (isPercentage && typeof numValue === 'number') {
    displayValue = formatPercentage(numValue / 100);
  }
  
  return (
    <Box className="stat-card">
      <Typography className="stat-card-label">
        {label}
      </Typography>
      <Typography 
        className={`stat-card-value ${showTrend ? (isPositive ? 'positive' : isNegative ? 'negative' : '') : ''}`}
        sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
      >
        {showTrend && isPositive && <TrendingUpIcon sx={{ fontSize: '1.5rem' }} />}
        {showTrend && isNegative && <TrendingDownIcon sx={{ fontSize: '1.5rem' }} />}
        {displayValue}
      </Typography>
    </Box>
  );
};

const ResultsDisplay = ({ results }) => {
  const [isLogScale, setIsLogScale] = useState(false);

  if (!results) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography color="text.secondary">No backtest results available.</Typography>
      </Box>
    );
  }

  const { portfolio_performance, benchmark_performance } = results;

  const plotData = [];
  let plotLayout = {
    xaxis: { 
      title: { text: 'Date', font: { size: 12, color: '#6b7280' } },
      gridcolor: '#f3f4f6',
      showline: false,
    },
    yaxis: { 
      title: { text: 'Portfolio Value', font: { size: 12, color: '#6b7280' } },
      autorange: true,
      type: isLogScale ? 'log' : 'linear',
      tickformat: '$,.0f',
      gridcolor: '#f3f4f6',
      showline: false,
    },
    autosize: true,
    margin: { t: 20, r: 20, l: 60, b: 40 },
    showlegend: true,
    legend: { 
      orientation: 'h',
      y: -0.15,
      x: 0.5,
      xanchor: 'center',
      font: { size: 11 }
    },
    plot_bgcolor: '#ffffff',
    paper_bgcolor: '#ffffff',
    hovermode: 'x unified',
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
      line: { color: '#2563eb', width: 2.5 },
      hovertemplate: '%{y:$,.2f}<extra></extra>',
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
      line: { color: '#6b7280', width: 2, dash: 'dot' },
      hovertemplate: '%{y:$,.2f}<extra></extra>',
    });
    if (lastDate === null || (benchmark_performance.dates.length > 0 && benchmark_performance.dates[benchmark_performance.dates.length - 1] > lastDate)) {
      lastDate = benchmark_performance.dates[benchmark_performance.dates.length - 1];
    }
    if (firstDate === null && benchmark_performance.dates.length > 0) {
      firstDate = benchmark_performance.dates[0];
    }
  }

  if (firstDate && lastDate) {
    plotLayout.xaxis.range = [firstDate, lastDate];
    plotLayout.xaxis.autorange = false;
  }
  
  const renderPerformanceStats = (title, performanceData, isPrimary = false) => {
    if (!performanceData) return null;
    
    const calculatedSharpeRatio = calculateSharpeRatio(performanceData);
    const sharpeRatio = performanceData.sharpe_ratio || calculatedSharpeRatio;
    const finalValue = performanceData.final_value || performanceData.values?.[performanceData.values.length - 1];
    
    return (
      <Box>
        <Typography 
          variant="h6" 
          gutterBottom 
          sx={{ 
            mb: 3, 
            fontWeight: 700,
            color: isPrimary ? 'primary.main' : 'text.secondary',
            fontSize: '1rem',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}
        >
          {title}
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={4}>
            <StatCard 
              label="Final Value" 
              value={finalValue}
              isCurrency={true}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <StatCard 
              label="Total Return" 
              value={performanceData.total_return * 100}
              isPercentage={true}
              showTrend={true}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <StatCard 
              label="Annualized Return" 
              value={performanceData.annualized_return * 100}
              isPercentage={true}
              showTrend={true}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <StatCard 
              label="Maximum Drawdown" 
              value={performanceData.max_drawdown * 100}
              isPercentage={true}
              showTrend={true}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <StatCard 
              label="Sharpe Ratio" 
              value={formatNumber(sharpeRatio)}
            />
          </Grid>
        </Grid>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 4 }}>
      {plotData.length > 0 && (
        <Box className="chart-container" sx={{ position: 'relative' }}>
          <Box sx={{ height: '450px' }}>
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
          </Box>
          <Box sx={{
            position: 'absolute',
            bottom: '60px',
            left: '24px',
            zIndex: 10,
          }}>
            <FormControlLabel
              control={
                <Switch
                  checked={isLogScale}
                  onChange={(e) => setIsLogScale(e.target.checked)}
                  size="small"
                />
              }
              label={
                <Typography sx={{ fontSize: '0.875rem', fontWeight: 500, color: 'text.secondary' }}>
                  Log Scale
                </Typography>
              }
            />
          </Box>
        </Box>
      )}

      {portfolio_performance && renderPerformanceStats('Portfolio Performance', portfolio_performance, true)}
      
      {benchmark_performance && (
        <Box sx={{ mt: 2 }}>
          {renderPerformanceStats('Benchmark Performance', benchmark_performance)}
        </Box>
      )}
    </Box>
  );
};

export default ResultsDisplay; 