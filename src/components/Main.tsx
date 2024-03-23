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

function MainPage() {
  const [filterConditions, setFilterConditions] = useLocalStorage<FilterCondition>(
    'filterConditions',
    {
      root: {
        '1-gutteral': true,
        '1-aleph': true,
        '1-nun': true,
        '1-waw': true,
        '1-yod': true,
        '2-gutteral': true,
        '3-heh': true,
        '3-aleph': true,
        hollow: true,
        geminate: true,
      },
      stem: {
        qal: true,
        niphal: true,
        piel: true,
        pual: true,
        hitpael: true,
        hiphil: true,
        hophal: true,
      },
      tense: {
        qatal: true,
        yiqtol: true,
        wayyiqtol: true,
        imperative: true,
        activeParticiple: true,
        passiveParticiple: true,
        infinitiveConstruct: true,
        infinitiveAbsolute: true,
      },
      suffixes: {
        include: true,
        exclusive: false,
      },
      minFrequency: 0,
    },
  )

  const currentWord = trpc.getWord.useQuery(
    { filterConditions },
    {
      refetchOnWindowFocus: false,
      retry(failureCount, error) {
        if (error.message.toLowerCase().includes('no valid verbs')) {
          return false
        }
        return failureCount < 3
      },
    },
  )
  console.log('error', currentWord.error)
  const error = useMemo(
    () => (
      currentWord.error?.message.toLowerCase().includes('no valid verbs')
        ? currentWord.error?.message
        : ''
    ),
    [currentWord.error],
  )
  const [cachedWord, setCachedWord] = useState(currentWord.data)
  useEffect(
    () => {
      if (currentWord.data) {
        setCachedWord(currentWord.data)
      }
    },
    [currentWord.data],
  )

  const [streak, setStreak] = useLocalStorage('currentStreak', 0)
  const [bestStreak, setBestStreak] = useLocalStorage('bestStreak', 0)

  const handleAnswer = useCallback(
    (correct: boolean) => {
      if (correct) {
        setStreak(s => s + 1)
        if (streak + 1 > bestStreak) {
          setBestStreak(streak + 1)
        }
      } else {
        setStreak(0)
      }
    },
    [],
  )
  const handleNext = useCallback(
    () => {
      currentWord.refetch()
    },
    [],
  )

  const onChangeFilter = useCallback(
    (newFilterConditions: FilterCondition) => {
      setFilterConditions(newFilterConditions)
      currentWord.refetch()
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
          {cachedWord && !error ? (
            <VerbParsing
              verb={cachedWord.verb}
              root={cachedWord.root}
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

          <Typography
            variant="h6"
            textAlign="center"
            fontWeight={400}
          >
            {'Current streak: '}
            <Typography
              variant="inherit"
              color={streak > 0 ? 'success' : 'inherit'}
              component="span"
            >
              {streak}
            </Typography>
            <br />
            {'Best streak: '}
            <Typography
              variant="inherit"
              color={streak === bestStreak ? 'success' : 'inherit'}
              component="span"
            >
              {bestStreak}
            </Typography>
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
