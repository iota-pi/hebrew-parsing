import { roots, verbs } from './data'
import { filterConditions, getFilterFromConditions } from './filter'
import { publicProcedure, router } from './trpc'
import { z } from 'zod'

export const appRouter = router({
  getWord: (
    publicProcedure
      .input(z.object({
        filterConditions,
      }))
      .query(async ({ input }) => {
        const { filterConditions } = input
        const filter = getFilterFromConditions(filterConditions)
        const validVerbs = (await verbs).filter(filter)
        const verb = validVerbs[Math.floor(Math.random() * validVerbs.length)]
        const root = (await roots).find(root => root.root === verb.root)
        return { verb, root }
      })
  ),
})


export type AppRouter = typeof appRouter
