import { useState } from 'react'
import Container from '@mui/material/Container'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Grid from '@mui/material/Grid'
import FormControl from '@mui/material/FormControl'
import FormLabel from '@mui/material/FormLabel'
import FormGroup from '@mui/material/FormGroup'
import FormControlLabel from '@mui/material/FormControlLabel'
import Checkbox from '@mui/material/Checkbox'
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
    if (pattern === '1') return 'blue'
    if (pattern === '3') return 'purple'
    if (pattern === '2u') return 'green'
    if (pattern === '2d') return 'red'
    return 'gray'
  }

  const renderChart = (timeframe, tfData) => {
    const colors = tfData.patterns.map(p => getPatternColor(p))
    
    const trace = {
      x: tfData.dates,
      open: tfData.open,
      high: tfData.high,
      low: tfData.low,
      close: tfData.close,
      type: 'candlestick',
      name: timeframe,
      increasing: { line: { color: 'green' } },
      decreasing: { line: { color: 'red' } },
      marker: {
        color: colors,
        line: { width: 2 }
      }
    }

    const layout = {
      title: `${data.ticker} - ${timeframe.toUpperCase()} Chart`,
      xaxis: {
        title: 'Date',
        rangeslider: { visible: false }
      },
      yaxis: {
        title: 'Price'
      },
      height: 400,
      margin: { t: 50, b: 50, l: 60, r: 30 },
      paper_bgcolor: 'white',
      plot_bgcolor: '#f9f9f9'
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
          }
        }
      }
      return null
    }).filter(a => a !== null)

    layout.annotations = annotations

    return (
      <Box key={timeframe} sx={{ mb: 3 }}>
        <Plot
          data={[trace]}
          layout={layout}
          config={{ responsive: true }}
          style={{ width: '100%' }}
        />
        <Box sx={{ mt: 1, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
          <Typography variant="body2">
            <strong>Pattern Legend:</strong> 
            <span style={{ color: 'blue', marginLeft: 8 }}>■ 1 = Inside Bar</span>
            <span style={{ color: 'green', marginLeft: 8 }}>■ 2u = Up Bar</span>
            <span style={{ color: 'red', marginLeft: 8 }}>■ 2d = Down Bar</span>
            <span style={{ color: 'purple', marginLeft: 8 }}>■ 3 = Outside Bar</span>
          </Typography>
        </Box>
      </Box>
    )
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        minHeight: '100vh',
        bgcolor: '#f5f5f5'
      }}>
        <Container maxWidth={false} sx={{ 
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          py: 4,
          px: 2,
          maxWidth: '1600px',
          mx: 'auto'
        }}>
          <Box sx={{ display: 'flex', flex: 1, gap: 2 }}>
            {/* Left Panel - Settings */}
            <Paper sx={{ width: '280px', p: 3, height: 'fit-content' }}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', mb: 3 }}>
                TheStrat Analysis
              </Typography>

              <TextField
                label="Ticker Symbol"
                value={ticker}
                onChange={(e) => setTicker(e.target.value)}
                fullWidth
                sx={{ mb: 2 }}
              />

              <DatePicker
                label="Start Date"
                value={startDate}
                onChange={setStartDate}
                slotProps={{ textField: { fullWidth: true, sx: { mb: 2 } } }}
              />

              <DatePicker
                label="End Date"
                value={endDate}
                onChange={setEndDate}
                slotProps={{ textField: { fullWidth: true, sx: { mb: 3 } } }}
              />

              <FormControl component="fieldset" sx={{ mb: 3 }}>
                <FormLabel component="legend" sx={{ mb: 1 }}>Timeframes</FormLabel>
                <FormGroup>
                  {Object.keys(selectedTimeframes).map(tf => (
                    <FormControlLabel
                      key={tf}
                      control={
                        <Checkbox
                          checked={selectedTimeframes[tf]}
                          onChange={handleTimeframeChange}
                          name={tf}
                        />
                      }
                      label={tf.toUpperCase()}
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
              >
                {isLoading ? 'Analyzing...' : 'Analyze'}
              </Button>
            </Paper>

            {/* Right Panel - Charts */}
            <Paper sx={{ flex: 1, p: 3, overflow: 'auto' }}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', mb: 2 }}>
                Multi-Timeframe Charts
              </Typography>

              {isLoading && (
                <Typography sx={{ textAlign: 'center', mt: 4 }}>
                  Loading data...
                </Typography>
              )}

              {error && (
                <Typography color="error" sx={{ textAlign: 'center', mt: 4 }}>
                  Error: {error}
                </Typography>
              )}

              {!isLoading && !error && !data && (
                <Typography variant="body1" color="textSecondary" sx={{ textAlign: 'center', mt: 4 }}>
                  Please set parameters and click Analyze to view charts
                </Typography>
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
        </Container>
      </Box>
    </LocalizationProvider>
  )
}

export default TheStratPage
