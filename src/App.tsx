import { BrowserRouter as Router } from 'react-router-dom'
import { Box } from '@mui/material'
import { styled } from '@mui/material/styles'
import Notice from './components/layout/Notice'
import EditDrawer from './components/drawers/EditDrawer'
import PageView from './components/pages'

const Root = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  height: '100vh',
})


export default function App() {
  return (
    <Router>
      <Root>
        <Box paddingBottom={7}>
          <PageView />
        </Box>

        <Notice />

        <EditDrawer />
      </Root>
    </Router>
  )
}
