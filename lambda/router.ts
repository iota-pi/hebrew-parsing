import { z } from 'zod'
import { biasOptions, getBiasedVerbs, getRandomValidVerb } from './bias'
import { roots, verbs } from './data'
import { filterConditions, getFilterFromConditions, getValidVerbs } from './filter'
import { publicProcedure, router } from './trpc'

export const appRouter = router({
  getWord: (
    publicProcedure
      .input(z.object({
        filterConditions,
        biasOptions,
      }))
      .query(async ({ input }) => {
        const { filterConditions, biasOptions } = input
        const filter = getFilterFromConditions(filterConditions)
        const allVerbs = await verbs
        const allRoots = await roots
        const validVerbs = getValidVerbs(allVerbs, allRoots, filter)
        const biasedVerbs = getBiasedVerbs(biasOptions, validVerbs)
        return getRandomValidVerb(biasedVerbs, allRoots)
      })
  ),
})


export type AppRouter = typeof appRouter
