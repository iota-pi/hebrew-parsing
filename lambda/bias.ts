import { z } from 'zod'
import type { RootMap, Verb } from './data'
import { RootKey, getRootTypes } from './filter'

export const biasOptions = z.object({
  biasRoots: z.boolean().default(true),
  biasStems: z.boolean().default(true),
  biasTenses: z.boolean().default(true),
})
export type BiasOptions = z.infer<typeof biasOptions>
export type BiasCompatibleKey = keyof Verb & ('stem' | 'tense')

export function getRandomValidVerb(
  validVerbs: Verb[],
  roots: RootMap,
) {
  const verb = validVerbs[Math.floor(Math.random() * validVerbs.length)]
  const root = roots[verb.root]
  return { verb, root }
}

export function countByKey<K extends BiasCompatibleKey>(
  key: K,
  verbs: Verb[],
) {
  return verbs.reduce(
    (acc, verb) => {
      acc[verb[key]] = (acc[verb[key]] || 0) + 1
      return acc
    },
    {} as Record<Verb[K], number>,
  )
}

export function countByRoot(
  verbs: Verb[],
  roots: RootMap,
) {
  return verbs.reduce(
    (acc, verb) => {
      const rootTypes = getRootTypes(roots[verb.root].root, verb.stem)
      for (const root of rootTypes) {
        acc[root] = (acc[root] || 0) + 1
      }
      return acc
    },
    {} as Record<RootKey, number>,
  )
}

export function getBiasedVerbs(
  biasOptions: BiasOptions,
  verbs: Verb[],
  roots: RootMap,
) {
  let workingVerbs = verbs
  if (biasOptions.biasRoots) {
    const rootCounts = countByRoot(workingVerbs, roots)
    const biasRoots = getBiasFromCounts(rootCounts)
    workingVerbs = applyBias(
      verbs,
      verb => getRootTypes(roots[verb.root].root, verb.stem),
      biasRoots,
    )
  }

  if (biasOptions.biasStems) {
    const stemCounts = countByKey('stem', workingVerbs)
    const biasStems = getBiasFromCounts(stemCounts)
    workingVerbs = applyBias(verbs, verb => verb.stem, biasStems)
  }

  if (biasOptions.biasTenses) {
    const tenseCounts = countByKey('tense', workingVerbs)
    const biasTenses = getBiasFromCounts(tenseCounts)
    workingVerbs = applyBias(verbs, verb => verb.tense, biasTenses)
  }

  return workingVerbs
}

export function getBiasFromCounts<T extends Record<string, number>>(
  counts: T,
): T {
  const minCount = objectMin(counts)
  const minCountLogged = Math.log(minCount)
  const loggedCounts = Object.fromEntries(
    Object.entries(counts).map(
      ([key, value]) => [key, Math.log(value)]
    )
  ) as T
  const targetEquivalentCounts = Object.fromEntries(
    Object.entries(loggedCounts).map(
      ([key, value]) => [key, (value / minCountLogged) * minCount]
    )
  ) as T

  const bias = Object.fromEntries(
    Object.entries(targetEquivalentCounts).map(
      ([key, value]) => [key, value / counts[key]]
    )
  ) as T
  return bias
}

export function objectTotal(
  obj: Record<string, number>,
) {
  return Object.values(obj).reduce((a, b) => a + b, 0)
}

export function objectMin(
  obj: Record<string, number>,
) {
  return Math.min(...Object.values(obj))
}

export function applyBias<K extends string, T extends Record<K, number>>(
  verbs: Verb[],
  key: (verb: Verb) => K | K[],
  bias: T,
) {
  return verbs.filter(
    verb => {
      const keyResult = key(verb)
      const biasKeys = Array.isArray(keyResult) ? keyResult : [keyResult]
      const biasThreshold = biasKeys.map(k => bias[k]).reduce((a, b) => Math.max(a, b), 1)
      return Math.random() < biasThreshold
    },
  )
}
