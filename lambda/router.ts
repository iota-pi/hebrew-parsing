import { Root, Verb, roots, verbs } from './data'
import { filterConditions, getFilterFromConditions } from './filter'
import { publicProcedure, router } from './trpc'
import { z } from 'zod'

const MAX_RANDOM_ATTEMPTS = 50

export const appRouter = router({
  getWord: (
    publicProcedure
      .input(z.object({
        filterConditions,
      }))
      .query(async ({ input }) => {
        const { filterConditions } = input
        const filter = getFilterFromConditions(filterConditions)
        const allVerbs = await verbs
        const allRoots = await roots
        let verb: Verb | undefined
        let root: Root | undefined
        let i = 0
        for (; i < MAX_RANDOM_ATTEMPTS; i++) {
          const randomVerb = allVerbs[Math.floor(Math.random() * allVerbs.length)]
          const connectedRoot = allRoots[randomVerb.root]
          if (!connectedRoot) {
            continue
          }
          if (filter(randomVerb, connectedRoot)) {
            verb = randomVerb
            root = connectedRoot
          }

          if (verb && root) {
            break
          }
        }

        if (!verb || !root) {
          const validVerbs = allVerbs.filter(
            v => filter(v, allRoots[v.root])
          )
          if (validVerbs.length === 0) {
            throw new Error('No valid verbs found')
          }
          verb = validVerbs[Math.floor(Math.random() * validVerbs.length)]
          root = allRoots[verb.root]
        }

        return { verb, root }
      })
  ),
})


export type AppRouter = typeof appRouter
