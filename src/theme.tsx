import { red, teal, yellow } from '@mui/material/colors'
import { createTheme } from '@mui/material/styles'

// A custom theme for this app
const theme = createTheme({
  palette: {
    primary: {
      main: teal[700],
    },
    secondary: {
      main: yellow[700],
    },
    error: {
      main: red.A400,
    },
  },
})

export default theme
