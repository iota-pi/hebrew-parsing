import {
  Box,
  Typography,
} from '@mui/material'
import { useAppDispatch, useAppSelector } from '../../store'
import { trpc } from '../../trpc'
import type { FilterCondition } from '../../../lambda/filter'
import VerbParsing from './VerbParsing'
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

  const currentWord = trpc.getWord.useQuery({ filterConditions })
  console.log(currentWord)

  const handleAnswer = useCallback(
    (correct: boolean) => {
      if (correct) {
        console.log("Correct answer!")
        // Perform any other actions for correct answer
      } else {
        console.log("Incorrect answer!")
        // Perform any other actions for incorrect answer
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
      </Box>
    </Box>
  )
}

export default MainPage
