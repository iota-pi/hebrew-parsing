import {
  awsLambdaRequestHandler,
  CreateAWSLambdaContextOptions,
// eslint-disable-next-line import/no-unresolved
} from '@trpc/server/adapters/aws-lambda'
import { APIGatewayProxyEventV2 } from 'aws-lambda'
import { appRouter } from './router'

const createContext = (
  _: CreateAWSLambdaContextOptions<APIGatewayProxyEventV2>
) => ({}) // no context
export const handler = awsLambdaRequestHandler({
  router: appRouter,
  createContext,
})
