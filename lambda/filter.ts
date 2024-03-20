import { z } from 'zod'
import type { Verb } from './data'

export const filterConditions = z.object({
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
  suffixes: z.boolean(),
  minFrequency: z.number(),
})
export type FilterCondition = z.infer<typeof filterConditions>

export function getFilterFromConditions(
  condition: FilterCondition | undefined,
): ((verb: Verb) => boolean) {
  return (verb: Verb) => {
    if (!condition) return true

    // TODO: implement filter conditions
    if (!verb.tense) return false
    return true
  }
}