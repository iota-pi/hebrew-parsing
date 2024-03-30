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

    if (!checkRoot(root.root, condition.root)) {
      return false
    }
    if (!condition.root['1-nun'] && (root.root === 'לקח' && verb.stem === 'Qal')) {
      return false
    }
    if (!condition.root['1-waw'] && root.root === 'הלך') {
      return false
    }

    if (!condition.stem[verb.stem]) {
      return false
    }

    if (!condition.tense[verb.tense]) {
      return false
    }

    if (!condition.suffixes.include && hasSetPGN(verb.suffix)) {
      return false
    }
    if (condition.suffixes.exclusive && !hasSetPGN(verb.suffix)) {
      return false
    }

    if (condition.minFrequency > root.count) {
      return false
    }

    return true
  }
}

export function checkRoot(root: string, condition: FilterCondition['root']) {
  let strong = true
  if ('עהחר'.includes(root[0])) {
    strong = false
    if (!condition['1-gutteral']) {
      return false
    }
  }

  if ('א'.includes(root[0])) {
    strong = false
    if (!condition['1-aleph']) {
      return false
    }
  }

  if ('נ'.includes(root[0])) {
    strong = false
    if (!condition['1-nun']) {
      return false
    }
  }

  if ('וי'.includes(root[0])) {
    strong = false
    if (!condition['1-waw']) {
      return false
    }
  }

  if ('אעהחר'.includes(root[1])) {
    strong = false
    if (!condition['2-gutteral']) {
      return false
    }
  }

  if ('ה'.includes(root[2])) {
    strong = false
    if (!condition['3-heh']) {
      return false
    }
  }

  if ('א'.includes(root[2])) {
    strong = false
    if (!condition['3-aleph']) {
      return false
    }
  }

  if ('וי'.includes(root[1]) || root.length === 2) {
    strong = false
    if (!condition.hollow) {
      return false
    }
  }

  if (isSameLetter(root[1], root[2])) {
    strong = false
    if (!condition.geminate) {
      return false
    }
  }

  if (strong && !condition.strong) {
    return false
  }

  return true
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
