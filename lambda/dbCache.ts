import {
  ConditionalCheckFailedException,
} from '@aws-sdk/client-dynamodb'
import { DeleteCommand, GetCommand, PutCommand, PutCommandInput } from '@aws-sdk/lib-dynamodb'
import { ddb } from './ddb'

// Repurpose the cache table for simple key-value storage
const TableName = process.env.CACHE_TABLE_NAME!

export async function setCache<T>(key: string, value: T, version?: number) {
  let versionCondition: Partial<PutCommandInput> = {}
  if (version) {
    versionCondition = {
      ConditionExpression: '#version = :version',
      ExpressionAttributeNames: {
        '#version': 'version',
      },
      ExpressionAttributeValues: {
        ':version': version,
      },
    }
  }
  await ddb.send(new PutCommand({
    TableName,
    Item: {
      cacheKey: key,
      cacheValue: value,
      version: version !== undefined ? version + 1 : 0,
    },
    ...versionCondition,
  }))
}

export async function updateCache<T>(
  key: string,
  initialValue: T,
  initialVersion: number,
  updater: (value: T) => T,
) {
  let value = updater(initialValue)
  let version = initialVersion
  for (let i = 0; i < 3; ++i) {
    try {
      // eslint-disable-next-line no-await-in-loop
      await setCache(key, value, version)
      return
    } catch (error) {
      if (!(error instanceof ConditionalCheckFailedException)) {
        throw new Error()
      }
      // eslint-disable-next-line no-await-in-loop
      const newData = await getCache<T>(key)
      if (newData) {
        value = updater(newData.value)
        version = newData.version
      }
    }
  }

  throw new Error(
    `Max attempts exceeded while attempting to update cache ${key} (version is now ${version})`,
  )
}

export async function clearCache(key: string) {
  await ddb.send(new DeleteCommand({
    TableName,
    Key: { cacheKey: key },
  }))
}

export async function getCache<T>(key: string) {
  const result = await ddb.send(new GetCommand({
    TableName,
    Key: { cacheKey: key },
  }))
  if (result.Item) {
    const {
      cacheValue: value,
      version,
    } = result.Item as {
      cacheValue: T,
      version: number,
    }
    return { value, version }
  }
  return undefined
}
