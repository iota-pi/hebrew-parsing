import type { APIGatewayProxyEvent } from 'aws-lambda'
import { GoneException } from '@aws-sdk/client-schemas'
import type { RequestBody } from './types'
import RequestHandler from './RequestHandler'


export async function handler(event: APIGatewayProxyEvent) {
  if (!event.body) {
    return { statusCode: 400 }
  }
  const body: RequestBody = JSON.parse(event.body)
  const handlerObject = new RequestHandler(event, body)
  const actionFunc = handlerObject.handlers[body.action]
  if (actionFunc) {
    try {
      await actionFunc()
    } catch (error) {
      // Silently ignore errors which come from client being disconnected
      if (!(error instanceof GoneException)) {
        throw error
      }
    }
    return { statusCode: 200 }
  }
  return { statusCode: 400 }
}

export default handler
