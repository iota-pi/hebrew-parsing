import {
  Box,
  Divider,
  Fade,
  LinearProgress,
  Stack,
  Typography,
} from '@mui/material'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocalStorage } from 'usehooks-ts'
import VerbParsing from './VerbParsing'
import FilterSelection from './FilterSelection'
import type { BiasOptions } from '../bias'
import type { FilterCondition } from '../filter'
import type { Entries } from '../util'
import type { LinkedOccurrence } from '../loadData'
import getWords from '../getWords'

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
    Hithpael: true,
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

  const [streak, setStreak] = useLocalStorage('currentStreak', 0)
  const [bestStreak, setBestStreak] = useLocalStorage('bestStreak', 0)
  const [, setCorrectCount] = useLocalStorage('correctCount', 0)
  const [totalCount, setTotalCount] = useLocalStorage('totalCount', 0)

  const [error, setError] = useState<string>('')
  const [verbs, setVerbs] = useState<LinkedOccurrence[]>([])

  useEffect(
    () => {
      setError('')
      getWords({ biasOptions, filterConditions })
        .then(setVerbs)
        .catch((e: Error) => {
          if (e.message?.toLowerCase().includes('no valid verbs')) {
            setVerbs([])
            setError(e.message)
          }
        })
    },
    [biasOptions, filterConditions],
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
      setVerbs(v => {
        const [old, ...newWords] = v
        return [...newWords, old]
      })
    },
    [],
  )
  const handleGiveAgain = useCallback(
    () => {
      setVerbs(v => [
        ...v.slice(1, 4),
        v[0],
        ...v.slice(4),
      ])
    },
    [],
  )

  const onChangeFilter = useCallback(
    (newFilterConditions: FilterCondition) => {
      setFilterConditions(newFilterConditions)
      setVerbs([])
      setError('')
    },
    [setFilterConditions, setVerbs],
  )

  return (
    <Box
      px={2}
      py={1}
      justifyContent="center"
      display="flex"
    >
      <Box position="fixed" top={0} left={0} right={0}>
        <Fade in={!error && verbs.length === 0}>
          <LinearProgress variant="query" />
        </Fade>
      </Box>

      <Box width="100%" maxWidth={1200}>
        <Stack spacing={2}>
          {verbs[0] && !error ? (
            <VerbParsing
              filterOptions={filterConditions}
              occurrence={verbs[0]}
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
