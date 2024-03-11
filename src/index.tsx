import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import CssBaseline from '@mui/material/CssBaseline'
import { StyledEngineProvider, ThemeProvider } from '@mui/material'
import App from './App'
import store from './store'
import theme from './theme'
// import persistor from './persistor'

// persistor.load()

const container = document.querySelector('#root')
const root = createRoot(container!)
root.render((
  <StyledEngineProvider injectFirst>
    <ThemeProvider theme={theme}>
      <CssBaseline />

      <Provider store={store}>
        <App />
      </Provider>
    </ThemeProvider>
  </StyledEngineProvider>
))
