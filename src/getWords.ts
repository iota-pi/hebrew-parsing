import { getBiasedVerbs, BiasOptions } from './bias'
import { getFilterFromConditions, FilterCondition } from './filter'
import { getLinkedOccurrences } from './loadData'

function shuffleArray<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
  }
  return array
}

export async function getWords({ biasOptions, filterConditions }: {
  biasOptions: BiasOptions,
  filterConditions: FilterCondition,
}) {
  const occurrencesPromise = getLinkedOccurrences()
  const filter = getFilterFromConditions(filterConditions)
  const occurrences = await occurrencesPromise
  const validVerbs = occurrences.filter(filter)
  const biasedVerbs = getBiasedVerbs(biasOptions, validVerbs)

  if (biasedVerbs.length === 0) {
    throw new Error('No valid verbs found')
  }
  shuffleArray(biasedVerbs)
  return biasedVerbs
}
