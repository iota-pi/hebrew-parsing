import { CreateTableCommand, DeleteTableCommand, ResourceNotFoundException, UpdateTimeToLiveCommand } from '@aws-sdk/client-dynamodb'
import { client } from './ddb'

async function initDBForTests() {
  await createTable('BGFConnections_test', 'session')
  await createTable('BGFState_test', 'session')
  await createTable('BGFCache_test', 'cacheKey')
}


async function createTable(name: string, hashKey: string) {
  try {
    await client.send(new DeleteTableCommand({
      TableName: name,
    }))
  } catch (error) {
    if (!(error instanceof ResourceNotFoundException)) {
      throw error
    }
  }

  const createResponse = await client.send(new CreateTableCommand({
    TableName: name,
    BillingMode: 'PAY_PER_REQUEST',
    KeySchema: [
      {
        AttributeName: hashKey,
        KeyType: 'HASH',
      },
    ],
    AttributeDefinitions: [
      {
        AttributeName: hashKey,
        AttributeType: 'S',
      },
    ],
  }))
  if (createResponse.$metadata.httpStatusCode !== 200) {
    throw new Error(`Could not create table: ${name}`)
  }
  const ttlResponse = await client.send(new UpdateTimeToLiveCommand({
    TableName: name,
    TimeToLiveSpecification: {
      AttributeName: 'ttl',
      Enabled: true,
    },
  }))
  if (ttlResponse.$metadata.httpStatusCode !== 200) {
    throw new Error(`Could not set TTL for table: ${name}`)
  }
}

initDBForTests()
