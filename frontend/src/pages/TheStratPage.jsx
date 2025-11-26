import { useState } from 'react'
import Container from '@mui/material/Container'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import FormControl from '@mui/material/FormControl'
import FormLabel from '@mui/material/FormLabel'
import FormGroup from '@mui/material/FormGroup'
import FormControlLabel from '@mui/material/FormControlLabel'
import Checkbox from '@mui/material/Checkbox'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import Chip from '@mui/material/Chip'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import Plot from 'react-plotly.js'
import axios from 'axios'

const API_BASE_URL = 'http://localhost:8000'

function TheStratPage() {
  const [ticker, setTicker] = useState('AAPL')
  const [startDate, setStartDate] = useState(new Date(new Date().setFullYear(new Date().getFullYear() - 1)))
  const [endDate, setEndDate] = useState(new Date())
  const [selectedTimeframes, setSelectedTimeframes] = useState({
    'D': true,
    'W': true,
    'M': true,
    '2d': false,
    '3d': false,
    '10d': false,
    '2w': false,
    '5w': false,
    '10w': false
  })
  const [data, setData] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleTimeframeChange = (event) => {
    setSelectedTimeframes({
      ...selectedTimeframes,
      [event.target.name]: event.target.checked
    })
  }

  const handleAnalyze = async () => {
    setIsLoading(true)
    setError(null)
    setData(null)

    const selectedTFs = Object.keys(selectedTimeframes).filter(tf => selectedTimeframes[tf])
    
    if (selectedTFs.length === 0) {
      setError('Please select at least one timeframe')
      setIsLoading(false)
      return
    }

    try {
      const response = await axios.post(`${API_BASE_URL}/api/thestrat`, {
        ticker: ticker.toUpperCase(),
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        timeframes: selectedTFs
      })
      setData(response.data)
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const getPatternColor = (pattern) => {
    if (pattern === '1') return '#2563eb'
    if (pattern === '3') return '#7c3aed'
    if (pattern === '2u') return '#10b981'
    if (pattern === '2d') return '#ef4444'
    return '#6b7280'
  }

  const renderChart = (timeframe, tfData) => {
    const trace = {
      x: tfData.dates,
      open: tfData.open,
      high: tfData.high,
      low: tfData.low,
      close: tfData.close,
      type: 'candlestick',
      name: timeframe,
      increasing: { line: { color: '#10b981', width: 1 } },
      decreasing: { line: { color: '#ef4444', width: 1 } },
    }

    const layout = {
      xaxis: {
        rangeslider: { visible: false },
        gridcolor: '#f3f4f6',
        showline: false,
      },
      yaxis: {
        gridcolor: '#f3f4f6',
        showline: false,
      },
      height: 400,
      margin: { t: 40, b: 40, l: 60, r: 30 },
      paper_bgcolor: '#ffffff',
      plot_bgcolor: '#ffffff',
      hovermode: 'x unified',
    }

    // Add pattern annotations
    const annotations = tfData.patterns.map((pattern, idx) => {
      if (pattern === '1' || pattern === '3') {
        return {
          x: tfData.dates[idx],
          y: tfData.high[idx],
          text: pattern,
          showarrow: true,
          arrowhead: 2,
          arrowsize: 1,
          arrowwidth: 2,
          arrowcolor: getPatternColor(pattern),
          ax: 0,
          ay: -30,
          font: {
            size: 12,
            color: getPatternColor(pattern),
            weight: 'bold'
          },
          bgcolor: 'rgba(255,255,255,0.8)',
          borderpad: 4,
        }
      }
      return null
    }).filter(a => a !== null)

    layout.annotations = annotations

    return (
      <Box key={timeframe} className="chart-container" sx={{ mb: 3 }}>
        <Typography 
          variant="h6" 
          sx={{ 
            mb: 2, 
            fontWeight: 700,
            color: 'text.primary',
            fontSize: '1rem'
          }}
        >
          {data.ticker} - {timeframe.toUpperCase()}
        </Typography>
        <Plot
          data={[trace]}
          layout={layout}
          config={{ responsive: true, displayModeBar: false }}
          style={{ width: '100%' }}
        />
        <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          <Chip 
            label="1 = Inside Bar" 
            size="small"
            className="pattern-badge inside"
            sx={{ fontWeight: 600 }}
          />
          <Chip 
            label="2u = Up Bar" 
            size="small"
            className="pattern-badge up"
            sx={{ fontWeight: 600 }}
          />
          <Chip 
            label="2d = Down Bar" 
            size="small"
            className="pattern-badge down"
            sx={{ fontWeight: 600 }}
          />
          <Chip 
            label="3 = Outside Bar" 
            size="small"
            className="pattern-badge outside"
            sx={{ fontWeight: 600 }}
          />
        </Box>
      </Box>
    )
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ 
        minHeight: 'calc(100vh - 64px)',
        bgcolor: 'background.default',
        py: 1.5,
        px: 1.5
      }}>
        <Container maxWidth={false} sx={{ maxWidth: '100%', px: 0 }}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {/* Sidebar */}
            <Paper 
              elevation={0}
              sx={{ 
                width: '280px', 
                p: 2, 
                height: 'fit-content',
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
                position: 'sticky',
                top: 12,
              }}
            >
              <Typography 
                variant="h6" 
                gutterBottom 
                sx={{ 
                  mb: 2,
                  fontWeight: 700,
                  color: 'text.primary',
                  fontSize: '1rem',
                }}
              >
                TheStrat Analysis
              </Typography>

              <TextField
                label="Ticker Symbol"
                value={ticker}
                onChange={(e) => setTicker(e.target.value)}
                fullWidth
                sx={{ mb: 2 }}
                size="small"
              />

              <DatePicker
                label="Start Date"
                value={startDate}
                onChange={setStartDate}
                slotProps={{ 
                  textField: { 
                    fullWidth: true, 
                    sx: { mb: 2 },
                    size: 'small'
                  } 
                }}
              />

              <DatePicker
                label="End Date"
                value={endDate}
                onChange={setEndDate}
                slotProps={{ 
                  textField: { 
                    fullWidth: true, 
                    sx: { mb: 3 },
                    size: 'small'
                  } 
                }}
              />

              <FormControl component="fieldset" sx={{ mb: 2 }}>
                <FormLabel 
                  component="legend" 
                  sx={{ 
                    mb: 1, 
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    color: 'text.primary'
                  }}
                >
                  Timeframes
                </FormLabel>
                <FormGroup>
                  {Object.keys(selectedTimeframes).map(tf => (
                    <FormControlLabel
                      key={tf}
                      control={
                        <Checkbox
                          checked={selectedTimeframes[tf]}
                          onChange={handleTimeframeChange}
                          name={tf}
                          size="small"
                        />
                      }
                      label={<Typography sx={{ fontSize: '0.875rem' }}>{tf.toUpperCase()}</Typography>}
                    />
                  ))}
                </FormGroup>
              </FormControl>

              <Button
                variant="contained"
                onClick={handleAnalyze}
                disabled={isLoading}
                fullWidth
                size="large"
                className="gradient-button"
                sx={{
                  py: 1.5,
                  fontWeight: 700,
                  fontSize: '0.9375rem',
                  textTransform: 'none',
                }}
              >
                {isLoading ? 'Analyzing...' : 'Analyze'}
              </Button>
            </Paper>

            {/* Main Content */}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Paper 
                elevation={0}
                sx={{ 
                  minHeight: 'calc(100vh - 88px)',
                  p: 2,
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
                {isLoading && (
                  <Box sx={{ 
                    display: 'flex', 
                    flexDirection: 'column',
                    alignItems: 'center', 
                    justifyContent: 'center',
                    minHeight: '600px',
                    gap: 2
                  }}>
                    <CircularProgress size={48} />
                    <Typography color="text.secondary">
                      Loading market data...
                    </Typography>
                  </Box>
                )}

                {error && (
                  <Alert severity="error" sx={{ borderRadius: 2 }}>
                    {error}
                  </Alert>
                )}

                {!isLoading && !error && !data && (
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    minHeight: '600px'
                  }}>
                    <Typography variant="body1" color="text.secondary">
                      Enter a ticker symbol and click Analyze to view multi-timeframe charts
                    </Typography>
                  </Box>
                )}

                {!isLoading && !error && data && (
                  <Box>
                    {Object.entries(data.timeframes).map(([tf, tfData]) => 
                      renderChart(tf, tfData)
                    )}
                  </Box>
                )}
              </Paper>
            </Box>
          </Box>
        </Container>
      </Box>
    </LocalizationProvider>
  )
}

export default TheStratPage
