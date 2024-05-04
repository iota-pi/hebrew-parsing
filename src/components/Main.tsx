import {
  Box,
  Divider,
  Fade,
  LinearProgress,
  Stack,
  Typography,
} from '@mui/material'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { TRPCClientError } from '@trpc/client'
import { useDebounceCallback, useLocalStorage } from 'usehooks-ts'
import { trpc } from '../trpc'
import VerbParsing from './VerbParsing'
import FilterSelection from './FilterSelection'
import type { BiasOptions } from '../../lambda/bias'
import type { VerbAndRoot } from '../../lambda/data'
import type { FilterCondition } from '../../lambda/filter'
import type { AppRouter } from '../../lambda/router'
import type { Entries } from '../util'

const defaultFilterConditions: FilterCondition = {
  root: {
    strong: true,
    '1-gutteral': true,
    '1-aleph': true,
    '1-nun': true,
    '1-waw': true,
    '2-gutteral': true,
    '3-heh': true,
    '3-aleph': true,
    hollow: true,
    geminate: true,
  },
  stem: {
    Qal: true,
    Niphal: true,
    Piel: true,
    Pual: true,
    Hitpael: true,
    Hiphil: true,
    Hophal: true,
  },
  tense: {
    Qatal: true,
    Yiqtol: true,
    Wayyiqtol: true,
    Imperative: true,
    "Active participle": true,
    "Passive participle": true,
    "Infinitive construct": true,
    "Infinitive absolute": true,
  },
  suffixes: {
    include: true,
    exclusive: false,
  },
  minFrequency: 50,
}

function MainPage() {
  const utils = trpc.useUtils()

  const [rawFilterConditions, setFilterConditions] = useLocalStorage<FilterCondition>(
    'filterConditions',
    defaultFilterConditions,
  )
  const filterConditions: FilterCondition = useMemo(
    () => Object.fromEntries(
      (Object.entries(defaultFilterConditions) as Entries<FilterCondition>).map(
        ([key, value]) => (
          [
            key,
            (
              key === 'minFrequency'
                ? rawFilterConditions[key] ?? value
                : {
                  ...value,
                  ...rawFilterConditions[key],
                }
            ),
          ]
        ),
      ) as Entries<FilterCondition>,
    ),
    [rawFilterConditions],
  )
  const [biasOptions] = useLocalStorage<BiasOptions>('biasOptions', {
    biasStems: true,
    biasTenses: true,
    biasRoots: true,
  })

  const [error, setError] = useState<string>('')
  const [fetchedCount, setFetchedCount] = useLocalStorage('fetchedCount', 0)
  const [verbs, setVerbs] = useLocalStorage<VerbAndRoot[]>('verbQueue', [])
  const [currentVerb, setCurrentVerb] = useLocalStorage<VerbAndRoot | undefined>('currentVerb', undefined)

  const [streak, setStreak] = useLocalStorage('currentStreak', 0)
  const [bestStreak, setBestStreak] = useLocalStorage('bestStreak', 0)
  const [, setCorrectCount] = useLocalStorage('correctCount', 0)
  const [totalCount, setTotalCount] = useLocalStorage('totalCount', 0)

  const fetchNewWords = useCallback(
    () => {
      setError('')
      utils.getWords.fetch(
        {
          biasOptions,
          filterConditions,
        },
      )
        .then(newVerbs => {
          setVerbs(
            verbs => {
              const existing = verbs ?? []
              const uniqueNew = newVerbs.filter(v1 => existing.every(v2 => v1.verb.verb !== v2.verb.verb))
              return [...existing, ...uniqueNew]
            },
          )
          setFetchedCount(c => newVerbs.length)
        })
        .catch((e: TRPCClientError<AppRouter>) => {
          if (e.message?.toLowerCase().includes('no valid verbs')) {
            setError(e.message)
            setCurrentVerb(undefined)
          } else {
            setError('Could not get words from server')
            setCurrentVerb(undefined)
          }
        })
    },
    [biasOptions, filterConditions, utils],
  )
  const debouncedFetchNewWords = useDebounceCallback(
    fetchNewWords,
    500,
  )

  const handleAnswer = useCallback(
    (correct: boolean) => {
      setTotalCount(c => c + 1)
      if (correct) {
        setCorrectCount(c => c + 1)
        setStreak(s => s + 1)
        if (streak + 1 > bestStreak) {
          setBestStreak(streak + 1)
        }
      } else {
        setStreak(0)
      }
    },
    [streak, bestStreak, setBestStreak, setCorrectCount, setStreak, setTotalCount],
  )
  const handleNext = useCallback(
    () => {
      if (verbs && verbs.length > 0) {
        setVerbs(v => {
          const [, ...newWords] = v
          return newWords
        })
      }

      if (!verbs || verbs.length === 0 || (verbs.length < fetchedCount / 2)) {
        debouncedFetchNewWords()
      }
    },
    [debouncedFetchNewWords, verbs],
  )
  const handleGiveAgain = useCallback(
    () => {
      if (currentVerb) {
        setVerbs(v => [
          ...v.slice(0, 4),
          v[0],
          ...v.slice(4),
        ])
      }
    },
    [currentVerb, debouncedFetchNewWords, verbs],
  )
  useEffect(
    () => {
      if ((!verbs || verbs.length === 0) && !error) {
        handleNext()
      }
      if (verbs?.[0]) {
        setCurrentVerb(verbs[0])
      }
    },
    [error, verbs, handleNext],
  )

  const onChangeFilter = useCallback(
    (newFilterConditions: FilterCondition) => {
      setFilterConditions(newFilterConditions)
      setVerbs([])
      setError('')
    },
    [setFilterConditions],
  )

  return (
    <Box
      px={2}
      py={1}
      justifyContent="center"
      display="flex"
    >
      <Box position="fixed" top={0} left={0} right={0}>
        <Fade in={!error && (!verbs || verbs.length === 0)}>
          <LinearProgress variant="query" />
        </Fade>
      </Box>

      <Box width="100%" maxWidth={1200}>
        <Stack spacing={2}>
          {currentVerb && !error ? (
            <VerbParsing
              filterOptions={filterConditions}
              verb={currentVerb.verb}
              root={currentVerb.root}
              onAnswer={handleAnswer}
              onNext={handleNext}
              onGiveAgain={handleGiveAgain}
            />
          ) : (
            <Typography
              variant="h2"
              textAlign="center"
              fontFamily={"'Ezra SIL', Roboto, David, sans-serif"}
              py={2}
            >
              {error || 'Loading...'}
            </Typography>
          )}

          <Typography>
            {'So far you\'ve practised on '}
            <strong>{totalCount ?? 0}</strong>
            {' words.'}
          </Typography>

          <Divider />

          <Typography
            variant="h4"
            textAlign="left"
            pt={2}
          >
            Filter Options
          </Typography>

          <FilterSelection
            filterConditions={filterConditions}
            onChange={onChangeFilter}
          />
        </Stack>
      </Box>
    </Box>
  )
}

export default MainPage
