import { createHTTPServer } from '@trpc/server/adapters/standalone'
import cors from 'cors'
import { appRouter } from './router'
import { LOCAL_PORT } from './constants'

const server = createHTTPServer({
  middleware: cors(),
  router: appRouter,
  createContext() {
    return {}
  },
})

server.listen(LOCAL_PORT)
server.on('listening', () => {
  console.info(`🚀 Server ready at http://localhost:${LOCAL_PORT}`)
})
