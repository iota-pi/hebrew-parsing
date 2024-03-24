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
import { useCallback, useEffect, useState } from 'react'
import FilterSelection from './FilterSelection'
import { BiasOptions } from '../../lambda/bias'
import { TRPCClientError } from '@trpc/client'
import { AppRouter } from '../../lambda/router'
import { VerbAndRoot } from '../../lambda/data'

function MainPage() {
  const utils = trpc.useUtils()

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
  const [biasOptions, setBiasOptions] = useLocalStorage<BiasOptions>('biasOptions', {
    biasStems: true,
    biasTenses: true,
  })

  const [error, setError] = useState<string>('')
  const [verbs, setVerbs] = useState<VerbAndRoot[]>()
  const [currentVerb, setCurrentVerb] = useState<VerbAndRoot>()

  const [streak, setStreak] = useLocalStorage('currentStreak', 0)
  const [bestStreak, setBestStreak] = useLocalStorage('bestStreak', 0)

  const fetchNewWords = useCallback(
    () => {
      utils.getWords.fetch({
        biasOptions,
        filterConditions,
      })
        .then(newWords => setVerbs(
          words => [...(words ?? []), ...newWords]
        ))
        .catch((e: TRPCClientError<AppRouter>) => {
          if (e.message?.toLowerCase().includes('no valid verbs')) {
            setError(e.message)
          }
        })
    },
    [filterConditions, biasOptions, utils],
  )

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
      if (!verbs) {
        handleNext()
      }
    },
    [verbs],
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
      setVerbs(undefined)
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
