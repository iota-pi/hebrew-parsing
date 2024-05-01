import { z } from 'zod'
import type { Root, RootMap, Verb } from './data'
import { hasSetPGN } from '../src/util'

export const filterConditions = z.object({
  'root': z.object({
    strong: z.boolean(),
    '1-gutteral': z.boolean(),
    '1-aleph': z.boolean(),
    '1-nun': z.boolean(),
    '1-waw': z.boolean(),
    '2-gutteral': z.boolean(),
    '3-heh': z.boolean(),
    '3-aleph': z.boolean(),
    hollow: z.boolean(),
    geminate: z.boolean(),
  }),
  'stem': z.object({
    Qal: z.boolean(),
    Niphal: z.boolean(),
    Piel: z.boolean(),
    Pual: z.boolean(),
    Hitpael: z.boolean(),
    Hiphil: z.boolean(),
    Hophal: z.boolean(),
  }),
  'tense': z.object({
    Qatal: z.boolean(),
    Yiqtol: z.boolean(),
    Wayyiqtol: z.boolean(),
    Imperative: z.boolean(),
    'Active participle': z.boolean(),
    'Passive participle': z.boolean(),
    'Infinitive construct': z.boolean(),
    'Infinitive absolute': z.boolean(),
  }),
  suffixes: z.object({
    include: z.boolean(),
    exclusive: z.boolean(),
  }),
  minFrequency: z.number(),
})
export type FilterCondition = z.infer<typeof filterConditions>
export type RootKey = keyof FilterCondition['root']
export type Stem = keyof FilterCondition['stem']
export type Tense = keyof FilterCondition['tense']

export function getFilterFromConditions(
  condition: FilterCondition | undefined,
): ((verb: Verb, root: Root) => boolean) {
  return (verb: Verb, root: Root) => {
    if (!condition) return true

    if (!checkRoot(root.root, condition.root, verb.stem)) {
      return false
    }

    if (!condition.stem[verb.stem]) {
      return false
    }

    if (!condition.tense[verb.tense]) {
      if (
        verb.stem === 'Qal'
        || verb.tense !== 'Passive participle'
        || !condition.tense['Active participle']
      ) {
        return false
      }
    }

    if (!condition.suffixes.include && hasSetPGN(verb.suffix)) {
      return false
    }
    if (
      condition.suffixes.include
      && condition.suffixes.exclusive
      && !hasSetPGN(verb.suffix)
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

  if ('וי'.includes(root[1]) || root.length === 2) {
    rootTypes.push('hollow')
  }

  if (isSameLetter(root[1], root[2])) {
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

export function getValidVerbs(
  verbs: Verb[],
  roots: RootMap,
  filter: (verb: Verb, root: Root) => boolean,
) {
  return verbs.filter(v => filter(v, roots[v.root]))
}
