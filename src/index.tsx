import { createRoot } from 'react-dom/client'
import CssBaseline from '@mui/material/CssBaseline'
import { StyledEngineProvider, ThemeProvider } from '@mui/material'
import App from './App'
import theme from './theme'

const container = document.querySelector('#root')
const root = createRoot(container!)
root.render((
  <StyledEngineProvider injectFirst>
    <ThemeProvider theme={theme}>
      <CssBaseline />

      <App />
    </ThemeProvider>
  </StyledEngineProvider>
))
