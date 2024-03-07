import { BrowserRouter as Router } from 'react-router-dom'
import { Box, Paper } from '@mui/material'
import { styled } from '@mui/material/styles'
import BottomNav from './components/layout/BottomNav'
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

        <Paper
          elevation={3}
          sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 'appBar' }}
        >
          <BottomNav />
        </Paper>

        <Notice />

        <EditDrawer />
      </Root>
    </Router>
  )
}
