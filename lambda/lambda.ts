import {
  awsLambdaRequestHandler,
} from '@trpc/server/adapters/aws-lambda'
import { appRouter } from './router'

export const handler = awsLambdaRequestHandler({
  router: appRouter,
})
