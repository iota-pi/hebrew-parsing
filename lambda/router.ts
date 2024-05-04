import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { biasOptions, getBiasedVerbs, getRandomValidVerb } from './bias'
import { VerbAndRoot, roots, verbs } from './data'
import { filterConditions, getFilterFromConditions, getValidVerbs } from './filter'
import { publicProcedure, router } from './trpc'

const BATCH_SIZE = 10

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
        const biasedVerbs = getBiasedVerbs(biasOptions, validVerbs, allRoots)

        if (biasedVerbs.length === 0) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'No valid verbs found',
          })
        }
        const result = (new Array(count * 2)).fill(0).map(
          () => getRandomValidVerb(biasedVerbs, allRoots)
        )
        const uniqueResult = result.filter(
          (v1, i) => result.findIndex(v2 => v2.verb.verb === v1.verb.verb) === i
        )
        return uniqueResult.slice(0, count)
      })
  ),
})


export type AppRouter = typeof appRouter
