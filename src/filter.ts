import { getBiasedVerbs, getRandomVerb, type BiasOptions } from './bias'
import type { LinkedOccurrence, Root, RootMap, Verb } from './loadData'
import { getLinkedOccurrences } from './loadData'
import { hasSetPGN } from './util'

export type FilterCondition = {
  'root': {
    strong: boolean,
    '1-gutteral': boolean,
    '1-aleph': boolean,
    '1-nun': boolean,
    '1-waw': boolean,
    '2-gutteral': boolean,
    '3-heh': boolean,
    '3-aleph': boolean,
    hollow: boolean,
    geminate: boolean,
  },
  'stem': {
    Qal: boolean,
    Niphal: boolean,
    Piel: boolean,
    Pual: boolean,
    Hithpael: boolean,
    Hiphil: boolean,
    Hophal: boolean,
  },
  'tense': {
    Qatal: boolean,
    Yiqtol: boolean,
    Wayyiqtol: boolean,
    Imperative: boolean,
    'Active participle': boolean,
    'Passive participle': boolean,
    'Infinitive construct': boolean,
    'Infinitive absolute': boolean,
  },
  suffixes: {
    include: boolean,
    exclusive: boolean,
  },
  minFrequency: number,
}
export type RootKey = keyof FilterCondition['root']
export type Stem = keyof FilterCondition['stem']
export type Tense = keyof FilterCondition['tense']

export function getFilterFromConditions(
  condition: FilterCondition | undefined,
): ((occurrence: LinkedOccurrence) => boolean) {
  return ({ root, parsing }) => {
    if (!condition) return true

    if (!checkRoot(root.root, condition.root, parsing.stem)) {
      return false
    }

    if (!condition.stem[parsing.stem]) {
      return false
    }

    if (!condition.tense[parsing.tense]) {
      if (
        parsing.stem === 'Qal'
        || parsing.tense !== 'Passive participle'
        || !condition.tense['Active participle']
      ) {
        return false
      }
    }

    if (!condition.suffixes.include && hasSetPGN(parsing.suffix)) {
      return false
    }
    if (
      condition.suffixes.include
      && condition.suffixes.exclusive
      && !hasSetPGN(parsing.suffix)
    ) {
      return false
    }

    if (condition.minFrequency > root.count) {
      return false
    }

    return true
  }
}

export function getRootTypes(root: string, stem: Stem) {
  const rootTypes: RootKey[] = []
  if ('עהחר'.includes(root[0])) {
    rootTypes.push('1-gutteral')
  }

  if ('א'.includes(root[0])) {
    rootTypes.push('1-aleph')
  }

  if ('נ'.includes(root[0]) || (root === 'לקח' && stem === 'Qal')) {
    rootTypes.push('1-nun')
  }

  if ('וי'.includes(root[0]) || root === 'הלך') {
    rootTypes.push('1-waw')
  }

  if ('אעהחר'.includes(root[1])) {
    rootTypes.push('2-gutteral')
  }

  if ('ה'.includes(root[2])) {
    rootTypes.push('3-heh')
  }

  if ('א'.includes(root[2])) {
    rootTypes.push('3-aleph')
  }

  const normalisedRoot = root.replace(/[\u05c1\u05c2]/g, '')
  if (
    ('וי'.includes(normalisedRoot[1]) || normalisedRoot.length === 2)
    && root !== 'היה'
    && root !== 'חיה'
    && root !== 'צוה'
  ) {
    rootTypes.push('hollow')
  }

  if (isSameLetter(normalisedRoot[1], normalisedRoot[2])) {
    rootTypes.push('geminate')
  }

  if (rootTypes.length === 0) {
    rootTypes.push('strong')
  }

  return rootTypes
}

export function checkRoot(
  root: string,
  condition: FilterCondition['root'],
  stem: Stem,
) {
  const rootTypes = getRootTypes(root, stem)

  return !(
    (rootTypes.includes('strong') && !condition.strong)
    || (rootTypes.includes('1-gutteral') && !condition['1-gutteral'])
    || (rootTypes.includes('1-aleph') && !condition['1-aleph'])
    || (rootTypes.includes('1-nun') && !condition['1-nun'])
    || (rootTypes.includes('1-waw') && !condition['1-waw'])
    || (rootTypes.includes('2-gutteral') && !condition['2-gutteral'])
    || (rootTypes.includes('3-heh') && !condition['3-heh'])
    || (rootTypes.includes('3-aleph') && !condition['3-aleph'])
    || (rootTypes.includes('hollow') && !condition.hollow)
    || (rootTypes.includes('geminate') && !condition.geminate)
  )
}

export function isSameLetter(a: string, b: string) {
  return replaceSofits(a) === replaceSofits(b)
}

export function replaceSofits(str: string) {
  return (
    str
      .replace(/ך$/, 'כ')
      .replace(/ם$/, 'מ')
      .replace(/ן$/, 'נ')
      .replace(/ף$/, 'פ')
      .replace(/ץ$/, 'צ')
  )
}

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
