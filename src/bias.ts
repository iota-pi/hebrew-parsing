import type { LinkedOccurrence, VerbParsing } from './loadData'
import { RootKey, getRootTypes } from './filter'

export type BiasOptions = {
  biasRoots: boolean,
  biasStems: boolean,
  biasTenses: boolean,
}
export type BiasCompatibleKey = keyof VerbParsing & ('stem' | 'tense')

export function getRandomVerb(
  validVerbs: LinkedOccurrence[],
) {
  return validVerbs[Math.floor(Math.random() * validVerbs.length)]
}

export function countByKey<K extends BiasCompatibleKey>(
  key: K,
  verbs: LinkedOccurrence[],
) {
  return verbs.reduce(
    (acc, { parsing }) => {
      acc[parsing[key]] = (acc[parsing[key]] || 0) + 1
      return acc
    },
    {} as Record<VerbParsing[K], number>,
  )
}

export function countByRoot(
  verbs: LinkedOccurrence[],
) {
  return verbs.reduce(
    (acc, { root, parsing }) => {
      const rootTypes = getRootTypes(root.root, parsing.stem)
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
  verbs: LinkedOccurrence[],
) {
  let workingVerbs = verbs
  if (biasOptions.biasRoots) {
    const rootCounts = countByRoot(workingVerbs)
    const biasRoots = getBiasFromCounts(rootCounts)
    workingVerbs = applyBias(
      workingVerbs,
      ({ root, parsing }) => getRootTypes(root.root, parsing.stem),
      biasRoots,
    )
  }

  if (biasOptions.biasStems) {
    const stemCounts = countByKey('stem', workingVerbs)
    const biasStems = getBiasFromCounts(stemCounts)
    workingVerbs = applyBias(workingVerbs, ({ parsing }) => parsing.stem, biasStems)
  }

  if (biasOptions.biasTenses) {
    const tenseCounts = countByKey('tense', workingVerbs)
    const biasTenses = getBiasFromCounts(tenseCounts)
    workingVerbs = applyBias(workingVerbs, ({ parsing }) => parsing.tense, biasTenses)
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
  occurrences: LinkedOccurrence[],
  key: (occurrence: LinkedOccurrence) => K | K[],
  bias: T,
) {
  return occurrences.filter(
    occurrence => {
      const keyResult = key(occurrence)
      const biasKeys = Array.isArray(keyResult) ? keyResult : [keyResult]
      const biasThreshold = biasKeys.map(k => bias[k]).reduce((a, b) => Math.max(a, b), 0)
      return Math.random() < biasThreshold
    },
  )
}
