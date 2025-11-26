import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom'
import Box from '@mui/material/Box'
import AppBar from '@mui/material/AppBar'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Container from '@mui/material/Container'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import './App.css'
import BacktestPage from './pages/BacktestPage'
import TheStratPage from './pages/TheStratPage'

const theme = createTheme({
  palette: {
    primary: {
      main: '#2563eb',
      dark: '#1d4ed8',
      light: '#eff6ff',
    },
    success: {
      main: '#10b981',
      light: '#d1fae5',
    },
    error: {
      main: '#ef4444',
      light: '#fee2e2',
    },
    background: {
      default: '#f8f9fb',
      paper: '#ffffff',
    },
    text: {
      primary: '#111827',
      secondary: '#6b7280',
    },
  },
  typography: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Helvetica Neue", sans-serif',
    h6: {
      fontWeight: 700,
      letterSpacing: '-0.5px',
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: '8px',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        },
      },
    },
  },
})

function NavBar() {
  const location = useLocation()
  
  return (
    <AppBar 
      position="static" 
      elevation={0}
      sx={{ 
        bgcolor: 'white',
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Container maxWidth="xl">
        <Toolbar sx={{ px: { xs: 0 } }}>
          <TrendingUpIcon sx={{ mr: 1.5, color: 'primary.main', fontSize: 28 }} />
          <Typography 
            variant="h6" 
            component="div" 
            sx={{ 
              flexGrow: 1,
              color: 'text.primary',
              fontSize: '1.25rem',
              fontWeight: 700,
            }}
          >
            Stock Analysis System
          </Typography>
          <Button 
            color="inherit" 
            component={Link} 
            to="/"
            sx={{
              mx: 0.5,
              color: location.pathname === '/' ? 'primary.main' : 'text.secondary',
              bgcolor: location.pathname === '/' ? 'primary.light' : 'transparent',
              '&:hover': {
                bgcolor: location.pathname === '/' ? 'primary.light' : 'rgba(0,0,0,0.04)',
              },
            }}
          >
            Portfolio Backtest
          </Button>
          <Button 
            color="inherit" 
            component={Link} 
            to="/thestrat"
            sx={{
              mx: 0.5,
              color: location.pathname === '/thestrat' ? 'primary.main' : 'text.secondary',
              bgcolor: location.pathname === '/thestrat' ? 'primary.light' : 'transparent',
              '&:hover': {
                bgcolor: location.pathname === '/thestrat' ? 'primary.light' : 'rgba(0,0,0,0.04)',
              },
            }}
          >
            TheStrat Analysis
          </Button>
        </Toolbar>
      </Container>
    </AppBar>
  )
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <Router>
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: 'background.default' }}>
          <NavBar />
          <Box sx={{ flex: 1 }}>
            <Routes>
              <Route path="/" element={<BacktestPage />} />
              <Route path="/thestrat" element={<TheStratPage />} />
            </Routes>
          </Box>
        </Box>
      </Router>
    </ThemeProvider>
  )
}

export default App
