import { Box } from '@mui/material'
import { styled } from '@mui/material/styles'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { httpBatchLink } from '@trpc/client'
import { BrowserRouter as Router } from 'react-router-dom'
import { trpc } from './trpc'
import { LOCAL_PORT } from '../lambda/constants'
import MainPage from './components/Main'

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
          ? 'https://xg438ztidl.execute-api.ap-southeast-2.amazonaws.com/'
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
              <MainPage />
            </Box>
          </Root>
        </Router>
      </QueryClientProvider>
    </trpc.Provider>
  )
}
