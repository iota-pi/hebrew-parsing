import {
  awsLambdaRequestHandler,
  CreateAWSLambdaContextOptions,
} from '@trpc/server/adapters/aws-lambda';
import { APIGatewayProxyEventV2 } from 'aws-lambda';
import { appRouter } from './router'

const createContext = ({
  event,
  context,
}: CreateAWSLambdaContextOptions<APIGatewayProxyEventV2>) => ({}) // no context
type Context = Awaited<ReturnType<typeof createContext>>;
export const handler = awsLambdaRequestHandler({
  router: appRouter,
  createContext,
})
