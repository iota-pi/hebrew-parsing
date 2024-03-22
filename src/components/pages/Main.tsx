import {
  Box,
  Typography,
} from '@mui/material'
import { useLocalStorage } from 'usehooks-ts'
import { useAppDispatch } from '../../store'
import { trpc } from '../../trpc'
import type { FilterCondition } from '../../../lambda/filter'
import VerbParsing from '../../VerbParsing'
import { useCallback } from 'react'

function MainPage() {
  const dispatch = useAppDispatch()

  const filterConditions: FilterCondition = {
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
    suffixes: true,
    minFrequency: 0,
  }

  const currentWord = trpc.getWord.useQuery(
    { filterConditions },
    { refetchOnWindowFocus: false },
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

  return (
    <Box
      padding={2}
      justifyContent="center"
      display="flex"
    >
      <Box maxWidth={800}>
        {currentWord.data ? (
          <VerbParsing
            verb={currentWord.data.verb}
            root={currentWord.data.root}
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
            Loading...
          </Typography>
        )}

        <Typography
          variant="h6"
          textAlign="center"
          fontWeight={400}
          py={2}
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
      </Box>
    </Box>
  )
}

export default MainPage
