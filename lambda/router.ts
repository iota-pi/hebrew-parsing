import { z } from 'zod'
import { biasOptions, getBiasedVerbs, getRandomValidVerb } from './bias'
import { VerbAndRoot, roots, verbs } from './data'
import { filterConditions, getFilterFromConditions, getValidVerbs } from './filter'
import { publicProcedure, router } from './trpc'

const BATCH_SIZE = 5

export const appRouter = router({
  getWords: (
    publicProcedure
      .input(z.object({
        biasOptions,
        count: z.number().default(BATCH_SIZE),
        filterConditions,
      }))
      .query(async ({ input }): Promise<VerbAndRoot[]> => {
        const { biasOptions, count, filterConditions } = input
        const filter = getFilterFromConditions(filterConditions)
        const allVerbs = await verbs
        const allRoots = await roots
        const validVerbs = getValidVerbs(allVerbs, allRoots, filter)
        const biasedVerbs = getBiasedVerbs(biasOptions, validVerbs)
        return new Array(count).fill(0).map(() => getRandomValidVerb(biasedVerbs, allRoots))
      })
  ),
})


export type AppRouter = typeof appRouter
