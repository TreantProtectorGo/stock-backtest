import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import Box from '@mui/material/Box'
import AppBar from '@mui/material/AppBar'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import './App.css'
import BacktestPage from './pages/BacktestPage'
import TheStratPage from './pages/TheStratPage'

function App() {
  return (
    <Router>
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <AppBar position="static">
          <Toolbar>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              Stock Analysis System
            </Typography>
            <Button color="inherit" component={Link} to="/">
              Portfolio Backtest
            </Button>
            <Button color="inherit" component={Link} to="/thestrat">
              TheStrat Analysis
            </Button>
          </Toolbar>
        </AppBar>

        <Box sx={{ flex: 1 }}>
          <Routes>
            <Route path="/" element={<BacktestPage />} />
            <Route path="/thestrat" element={<TheStratPage />} />
          </Routes>
        </Box>
      </Box>
    </Router>
  )
}

export default App
