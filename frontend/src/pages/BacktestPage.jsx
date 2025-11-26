import { useState } from 'react'
import Container from '@mui/material/Container'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
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
    console.log("Form Data Submitted: ", formData)

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
        maxWidth: '1400px',
        mx: 'auto'
      }}>
        <Box sx={{ 
          display: 'flex', 
          flex: 1,
          gap: 1
        }}>
          {/* Left: Input Form */}
          <Paper sx={{ 
            width: '200px',
            p: 2,
            height: 'fit-content'
          }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', mb: 2 }}>
              Settings
            </Typography>
            <BacktestForm onSubmit={handleBacktestSubmit} isLoading={isLoading} />
          </Paper>

          {/* Right: Results */}
          <Paper sx={{ 
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'auto'
          }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', p: 2, pb: 1 }}>
              Results
            </Typography>
            {isLoading && <Typography sx={{ p: 2 }}>Loading...</Typography>}
            {error && <Typography color="error" sx={{ p: 2 }}>Error: {error}</Typography>}
            
            {!isLoading && !error && backtestResults && 
              <ResultsDisplay results={backtestResults} />
            }
            {!isLoading && !error && !backtestResults && (
              <Typography variant="body1" color="textSecondary" sx={{textAlign: 'center', mt: 2, p: 2}}>
                (Please set parameters and start backtest)
              </Typography>
            )}
          </Paper>
        </Box>
      </Container>
    </Box>
  )
}

export default BacktestPage
