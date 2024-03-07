import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'

export const client = new DynamoDBClient({
  apiVersion: '2012-08-10',
  ...(process.env.NODE_ENV === 'test' ? {
    region: 'local',
    endpoint: 'http://127.0.0.1:8000',
    credentials: {
      accessKeyId: 'foo',
      secretAccessKey: 'bar',
    },
  } : {
    region: 'ap-southeast-2',
  }),
})
export const ddb = DynamoDBDocumentClient.from(client)

export default ddb
