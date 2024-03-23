import { z } from 'zod'
import type { Root, Verb } from './data'
import { hasSetPGN } from '../src/util'

export const filterConditions = z.object({
  'root': z.object({
    '1-gutteral': z.boolean(),
    '1-aleph': z.boolean(),
    '1-nun': z.boolean(),
    '1-waw': z.boolean(),
    '1-yod': z.boolean(),
    '2-gutteral': z.boolean(),
    '3-heh': z.boolean(),
    '3-aleph': z.boolean(),
    hollow: z.boolean(),
    geminate: z.boolean(),
  }),
  'stem': z.object({
    qal: z.boolean(),
    niphal: z.boolean(),
    piel: z.boolean(),
    pual: z.boolean(),
    hitpael: z.boolean(),
    hiphil: z.boolean(),
    hophal: z.boolean(),
  }),
  'tense': z.object({
    qatal: z.boolean(),
    yiqtol: z.boolean(),
    wayyiqtol: z.boolean(),
    imperative: z.boolean(),
    activeParticiple: z.boolean(),
    passiveParticiple: z.boolean(),
    infinitiveConstruct: z.boolean(),
    infinitiveAbsolute: z.boolean(),
  }),
  suffixes: z.object({
    include: z.boolean(),
    exclusive: z.boolean(),
  }),
  minFrequency: z.number(),
})
export type FilterCondition = z.infer<typeof filterConditions>

export function getFilterFromConditions(
  condition: FilterCondition | undefined,
): ((verb: Verb, root: Root) => boolean) {
  return (verb: Verb, root: Root) => {
    if (!condition) return true

    if (!checkRoot(verb.root, condition.root)) {
      return false
    }
    if (!condition.root['1-nun'] && (verb.root === 'לקח' && verb.stem === 'Qal')) {
      return false
    }

    if (!condition.stem[verb.stem.toLowerCase() as keyof FilterCondition['stem']]) {
      return false
    }

    if (!condition.tense[verb.tense.toLowerCase() as keyof FilterCondition['tense']]) {
      return false
    }

    if (!condition.suffixes.include && hasSetPGN(verb.suffixParsing)) {
      return false
    }
    if (condition.suffixes.exclusive && !hasSetPGN(verb.suffixParsing)) {
      return false
    }

    if (condition.minFrequency > root.count) {
      return false
    }

    return true
  }
}

export function checkRoot(root: string, condition: FilterCondition['root']) {
  return !(
    (!condition['1-gutteral'] && 'עהחר'.includes(root[0]))
    || (!condition['1-aleph'] && 'א'.includes(root[0]))
    || (!condition['1-nun'] && ('נ'.includes(root[0])))
    || (!condition['1-waw'] && 'ו'.includes(root[0]))
    || (!condition['1-yod'] && 'י'.includes(root[0]))
    || (!condition['2-gutteral'] && 'אעהחר'.includes(root[1]))
    || (!condition['3-heh'] && 'ה'.includes(root[2]))
    || (!condition['3-aleph'] && 'א'.includes(root[2]))
    || (!condition.hollow && ('וי'.includes(root[1]) || root.length === 2))
    || (!condition.geminate && root[1] === root[2])
  )
}
