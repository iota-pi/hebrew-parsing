export type ICache<T> = Array<T | undefined | ICache<T>>

export class ScorerCache<T> {
  private cache: ICache<T>

  constructor() {
    this.cache = []
  }

  withCache<S>(scoreFunc: (data: S) => T) {
    return (data: S, cacheKey?: number[]) => {
      if (cacheKey !== undefined) {
        const cachedScore = this.get(cacheKey)
        if (cachedScore !== undefined) {
          return cachedScore
        }
      }

      const result = scoreFunc(data)

      if (cacheKey) {
        this.set(cacheKey, result)
      }

      return result
    }
  }

  get(key: number[]): T | undefined {
    let current = this.cache
    for (let i = 0; i < key.length; ++i) {
      const next = current[key[i]]
      if (!Array.isArray(next)) {
        return next
      }
      current = next
    }

    return undefined
  }

  set(key: number[], value: T): void {
    this.setInternal(key, value)
  }

  has(key: number[]) {
    return this.get(key) !== undefined
  }

  delete(key: number[]): void {
    this.setInternal(key, undefined)
  }

  clear(): void {
    this.cache = []
  }

  private setInternal(key: number[], value: T | undefined): void {
    let current = this.cache
    for (let i = 0; i < key.length - 1; ++i) {
      const next = current[key[i]]
      if (!Array.isArray(next)) {
        const newItem: ICache<T> = []
        current[key[i]] = newItem
        current = newItem
      } else {
        current = next
      }
    }

    current[key[key.length - 1]] = value
  }
}

export default ScorerCache
