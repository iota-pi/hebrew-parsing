import { z } from 'zod'
import type { RootMap, Verb } from './data'
import { TRPCError } from '@trpc/server'

export const biasOptions = z.object({
  biasStems: z.boolean(),
  biasTenses: z.boolean(),
})
export type BiasOptions = z.infer<typeof biasOptions>
export type BiasCompatibleKey = keyof Verb & ('stem' | 'tense')

export function getRandomValidVerb(
  validVerbs: Verb[],
  roots: RootMap,
) {
  if (validVerbs.length === 0) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'No valid verbs found',
    })
  }
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
    {} as Record<Verb[K], number>
  )
}

export function getBiasedVerbs(
  biasOptions: BiasOptions,
  verbs: Verb[],
) {
  let workingVerbs = verbs
  if (biasOptions.biasStems) {
    const stemCounts = countByKey('stem', workingVerbs)
    const biasStems = getBiasFromCounts(stemCounts)
    workingVerbs = applyBias(verbs, 'stem', biasStems)
  }

  if (biasOptions.biasTenses) {
    const tenseCounts = countByKey('tense', workingVerbs)
    const biasTenses = getBiasFromCounts(tenseCounts)
    workingVerbs = applyBias(verbs, 'tense', biasTenses)
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

export function applyBias<K extends BiasCompatibleKey, T extends Record<Verb[K], number>>(verbs: Verb[], key: K, bias: T) {
  return verbs.filter(verb => Math.random() < bias[verb[key]])
}
