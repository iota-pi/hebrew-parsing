import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb'
import { ddb } from './ddb'
import { ONE_MINUTE } from './util'

const TableName = process.env.CACHE_TABLE_NAME || `BGFCache_${process.env.NODE_ENV}`

const CACHE_MINUTES = 5

class CCBDataCache<K, T> {
  private data: Map<K, T>

  constructor() {
    this.data = new Map()
  }

  async set(key: K, value: T): Promise<void> {
    this.data.set(key, value)
    await ddb.send(new PutCommand({
      TableName,
      Item: {
        cacheKey: key,
        value: JSON.stringify(value),
        ttl: Date.now() + CACHE_MINUTES * ONE_MINUTE,
      },
    }))
  }

  async setDefault(key: K, generator: () => (Promise<T> | T), force = false): Promise<void> {
    // NB: not atomic!
    if (force || !(await this.has(key))) {
      await this.set(key, await generator())
    }
  }

  async has(key: K): Promise<boolean> {
    return await this.get(key) !== undefined
  }

  async get(key: K): Promise<T | undefined> {
    if (this.data.has(key)) {
      return this.data.get(key)
    }

    const result = await ddb.send(new GetCommand({
      TableName,
      Key: { cacheKey: key },
    }))
    if (!result.Item || result.Item.ttl < Date.now()) {
      return undefined
    }
    const value = JSON.parse(result.Item.value)
    this.data.set(key, value)
    return value as T
  }
}

export default CCBDataCache
