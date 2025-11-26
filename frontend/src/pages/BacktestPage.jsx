import { useState } from 'react'
import Container from '@mui/material/Container'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import BacktestForm from '../components/BacktestForm'
import ResultsDisplay from '../components/ResultsDisplay'
import { submitBacktest } from '../services/api'

function BacktestPage() {
  const [backtestResults, setBacktestResults] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleBacktestSubmit = async (formData) => {
    setIsLoading(true)
    setError(null)
    setBacktestResults(null)

    try {
      const results = await submitBacktest(formData)
      setBacktestResults(results)
    } catch (err) {
      setError(err.message || 'An error occurred during backtest.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
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
              height: 'fit-content',
              p: 2,
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
              Backtest Settings
            </Typography>
            <BacktestForm onSubmit={handleBacktestSubmit} isLoading={isLoading} />
          </Paper>

          {/* Main Content */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Paper 
              elevation={0}
              sx={{ 
                minHeight: 'calc(100vh - 88px)',
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
                overflow: 'hidden',
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
                    Running backtest analysis...
                  </Typography>
                </Box>
              )}
              
              {error && (
                <Box sx={{ p: 3 }}>
                  <Alert severity="error" sx={{ borderRadius: 2 }}>
                    {error}
                  </Alert>
                </Box>
              )}
              
              {!isLoading && !error && backtestResults && 
                <ResultsDisplay results={backtestResults} />
              }
              
              {!isLoading && !error && !backtestResults && (
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  minHeight: '600px'
                }}>
                  <Typography variant="body1" color="text.secondary">
                    Configure your portfolio settings and click "Start Backtest" to begin
                  </Typography>
                </Box>
              )}
            </Paper>
          </Box>
        </Box>
      </Container>
    </Box>
  )
}

export default BacktestPage
