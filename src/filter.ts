import type { LinkedOccurrence, Root } from './loadData'
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
  extras: {
    cohortatives: boolean,
    energicNuns: boolean,
    paragogicHehs: boolean,
    paragogicNuns: boolean,
  },
  minFrequency: number,
}
export type RootKey = keyof FilterCondition['root']
export type Stem = keyof FilterCondition['stem']
export type Tense = keyof FilterCondition['tense']

export function getFilterFromConditions(
  condition: FilterCondition | undefined,
): ((occurrence: LinkedOccurrence) => boolean) {
  if (!condition) return () => true

  return ({ root, parsings }) => {
    if (parsings.length === 1) {
      return false
    }

    if (condition.minFrequency > root.count) {
      return false
    }

    if (!parsings.some(p => condition.stem[p.stem])) {
      return false
    }

    if (!parsings.some(p => condition.tense[p.tense])) {
      if (
        parsings.some(p => (
          p.stem === 'Qal'
          || p.tense !== 'Passive participle'
          || !condition.tense['Active participle']
        ))
      ) {
        return false
      }
    }

    if (
      !condition.suffixes.include
      && parsings.every(p => hasSetPGN(p.suffix))
    ) {
      return false
    }
    if (
      condition.suffixes.include
      && condition.suffixes.exclusive
      && !parsings.some(p => hasSetPGN(p.suffix))
    ) {
      return false
    }

    if (!condition.extras.cohortatives && parsings.some(p => p.cohortative)) {
      return false
    }
    if (!condition.extras.energicNuns && parsings.some(p => p.energicNun)) {
      return false
    }
    if (!condition.extras.paragogicHehs && parsings.some(p => p.paragogicHeh)) {
      return false
    }
    if (!condition.extras.paragogicNuns && parsings.some(p => p.paragogicNun)) {
      return false
    }

    if (!checkRootType(root, condition.root, parsings[0].stem)) {
      return false
    }

    return true
  }
}

export function checkRootType(
  root: Root,
  condition: FilterCondition['root'],
  stem: Stem,
) {
  const rootTypes = root.types

  if (!condition['1-nun'] && root.root === 'לקח' && stem === 'Qal') {
    return false
  }

  return !(
    (!condition.strong && rootTypes.has('strong'))
    || (!condition['1-gutteral'] && rootTypes.has('1-gutteral'))
    || (!condition['1-aleph'] && rootTypes.has('1-aleph'))
    || (!condition['1-nun'] && rootTypes.has('1-nun'))
    || (!condition['1-waw'] && rootTypes.has('1-waw'))
    || (!condition['2-gutteral'] && rootTypes.has('2-gutteral'))
    || (!condition['3-heh'] && rootTypes.has('3-heh'))
    || (!condition['3-aleph'] && rootTypes.has('3-aleph'))
    || (!condition.hollow && rootTypes.has('hollow'))
    || (!condition.geminate && rootTypes.has('geminate'))
  )
}
