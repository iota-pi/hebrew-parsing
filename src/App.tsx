import { Box } from '@mui/material'
import { styled } from '@mui/material/styles'
import MainPage from './components/Main'

const Root = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  height: '100vh',
})

export default function App() {
  return (
    <Root>
      <Box paddingBottom={7}>
        <MainPage />
      </Box>
    </Root>
  )
}
