import { GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { ddb } from './ddb'
import { LOGIN_EXPIRY, ONE_MONTH } from './util'

const TableName = (
  process.env.CONNECTION_TABLE_NAME || `BGFConnections_${process.env.NODE_ENV}`
)

export async function register(session: string, connection: string) {
  const item = await ddb.send(new GetCommand({
    TableName,
    Key: { session },
  }))

  const updateParts = [
    '#ttl = :ttl',
    'loginTime = :loginTime',
  ]
  const attributeNames: Record<string, string> = {
    '#ttl': 'ttl',
  }
  const now = Date.now()
  const attributeValues: Record<string, number | string | object> = {
    ':ttl': now + ONE_MONTH,
    ':loginTime': now,
  }
  if (!item.Item || !item.Item.connections.includes(connection)) {
    updateParts.push('#c = list_append(if_not_exists(#c, :empty), :new)')
    attributeNames['#c'] = 'connections'
    attributeValues[':new'] = [connection]
    attributeValues[':empty'] = []
  }

  await ddb.send(new UpdateCommand({
    TableName,
    Key: { session },
    UpdateExpression: (
      `SET ${updateParts.join(', ')}`
    ),
    ExpressionAttributeNames: attributeNames,
    ExpressionAttributeValues: attributeValues,
  }))
}

export async function deleteConnection(
  session: string,
  connection: string,
  retry = true,
): Promise<void> {
  const item = await ddb.send(new GetCommand({
    TableName,
    Key: { session },
  }))
  try {
    const connections = (item.Item?.connections || []) as string[]
    await ddb.send(new UpdateCommand({
      TableName,
      Key: { session },
      ConditionExpression: 'attribute_exists(#c) AND size(#c) = :expectedSize',
      ExpressionAttributeNames: {
        '#c': 'connections',
      },
      ExpressionAttributeValues: {
        ':c': connections.filter(c => c !== connection),
        ':expectedSize': connections.length,
      },
      UpdateExpression: 'SET #c = :c',
    }))
  } catch (error) {
    console.error(`Failed to delete old connection (${connection}) from session ${session}`, error)
    if (retry) {
      console.info('Retrying deletion')
      await deleteConnection(session, connection, false)
    }
  }
}

export async function getAllConnections(session: string) {
  const result = await ddb.send(new GetCommand({
    TableName,
    Key: { session },
    ExpressionAttributeNames: {
      '#connections': 'connections',
    },
    ProjectionExpression: '#connections',
  }))
  const item = result.Item as { connections: string[] }
  return item.connections
}

export async function getOtherConnections(session: string, connection: string) {
  const allConnections = await getAllConnections(session)
  return allConnections.filter(c => c !== connection)
}

export async function checkLoggedIn(session: string) {
  const result = await ddb.send(new GetCommand({
    TableName,
    Key: { session },
    ProjectionExpression: 'loginTime',
  }))
  if (!result.Item) {
    return false
  }

  const item = result.Item as { loginTime: number }
  return item.loginTime + LOGIN_EXPIRY > Date.now()
}
