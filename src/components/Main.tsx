import {
  Box,
  Divider,
  Stack,
  Typography,
} from '@mui/material'
import { useLocalStorage } from 'usehooks-ts'
import { trpc } from '../trpc'
import type { FilterCondition } from '../../lambda/filter'
import VerbParsing from './VerbParsing'
import { useCallback, useEffect, useMemo, useState } from 'react'
import FilterSelection from './FilterSelection'
import { BiasOptions } from '../../lambda/bias'
import { TRPCClientError } from '@trpc/client'
import { AppRouter } from '../../lambda/router'
import { VerbAndRoot } from '../../lambda/data'
import { Entries } from '../util'

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
  })

  const [error, setError] = useState<string>('')
  const [verbs, setVerbs] = useState<VerbAndRoot[]>()
  const [currentVerb, setCurrentVerb] = useState<VerbAndRoot>()

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
        .then(newWords => setVerbs(
          words => [...(words ?? []), ...newWords]
        ))
        .catch((e: TRPCClientError<AppRouter>) => {
          if (e.message?.toLowerCase().includes('no valid verbs')) {
            setError(e.message)
            setCurrentVerb(undefined)
          }
        })
    },
    [filterConditions, biasOptions, utils],
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
    [streak, bestStreak],
  )
  const handleNext = useCallback(
    () => {
      if (!verbs || verbs.length <= 2) {
        fetchNewWords()
      }
      if (!verbs) {
        return
      }

      const newWords = [...verbs]
      newWords.shift()
      setVerbs(newWords)
    },
    [verbs, fetchNewWords],
  )
  useEffect(
    () => {
      if ((!verbs || verbs.length === 0) && !error) {
        handleNext()
      }
    },
    [error, verbs],
  )
  useEffect(
    () => {
      if (verbs?.[0]) {
        setCurrentVerb(verbs[0])
      }
    },
    [verbs],
  )

  const onChangeFilter = useCallback(
    (newFilterConditions: FilterCondition) => {
      setFilterConditions(newFilterConditions)
      setVerbs([])
      setError('')
    },
    [],
  )

  return (
    <Box
      px={2}
      py={1}
      justifyContent="center"
      display="flex"
    >
      <Box maxWidth={1200} flexGrow={1}>
        <Stack spacing={2}>
          {currentVerb && !error ? (
            <VerbParsing
              filterOptions={filterConditions}
              verb={currentVerb.verb}
              root={currentVerb.root}
              onAnswer={handleAnswer}
              onNext={handleNext}
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
