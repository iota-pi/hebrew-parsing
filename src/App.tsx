import { Box } from '@mui/material'
import { styled } from '@mui/material/styles'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { httpBatchLink } from '@trpc/client'
import { BrowserRouter as Router } from 'react-router-dom'
import Notice from './components/layout/Notice'
import PageView from './components/pages'
import { trpc } from './trpc';
import { LOCAL_PORT } from '../lambda/constants'

const Root = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  height: '100vh',
})

const queryClient = new QueryClient()
const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: (
        import.meta.env.NODE_ENV === 'production'
          ? import.meta.env.VITE_API_URL || ''
          : `http://localhost:${LOCAL_PORT}`
      ),
    }),
  ],
})

export default function App() {
  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <Router>
          <Root>
            <Box paddingBottom={7}>
              <PageView />
            </Box>

            <Notice />

            {/* <EditDrawer /> */}
          </Root>
        </Router>
      </QueryClientProvider>
    </trpc.Provider>
  )
}
