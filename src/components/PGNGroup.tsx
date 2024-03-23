import {
  Stack,
  ToggleButtonGroup,
} from '@mui/material'
import {
  Parsing,
  ParsingKey,
  getPartFromVerb,
  ApplicableParts,
  checkPGN,
  ALL_PERSONS,
  ALL_NUMBERS,
  ALL_GENDERS,
  getPGNKey,
  isValidPGN,
  isValidSuffix,
  hasSetPGN,
} from '../util'
import type { NA, PGN, Verb } from '../../lambda/data'
import { useCallback, useMemo } from 'react'
import ParsingControl from './ParsingControl'


function PGNGroup<P extends ParsingKey & ('pgn' | 'suffix')>({
  applicable,
  onChange,
  parsing,
  part,
  showAnswer,
  value,
  verb,
}: {
  applicable: ApplicableParts[P],
  onChange: (newValue: PGN) => void,
  parsing: Parsing,
  part: P,
  showAnswer: boolean,
  value: PGN,
  verb: Verb,
}) {
  const handleChange = useCallback(
    (event: React.MouseEvent<HTMLElement>, newData: PGN) => {
      if (newData) {
        onChange(newData)
      }
    },
    [part, value],
  )

  const isValid = part === 'pgn' ? isValidPGN : isValidSuffix

  const pgnOptions: [PGN[], PGN[]] = useMemo(
    () => {
      const result: [PGN[], PGN[]] = [[], []]
      if (!applicable) {
        return result
      }

      const hasPerson = !(
        parsing.tense === 'Imperative'
        || parsing.tense === 'Active participle'
        || parsing.tense === 'Passive participle'
      )
      const possiblePersons = (
        applicable.person === false || !hasPerson
          ? ['N/A' as NA]
          : ALL_PERSONS.filter(x => x !== 'N/A')
      )
      const possibleGenders = (
        applicable.gender === false
          ? ['N/A' as NA]
          : ALL_GENDERS.filter(x => applicable.gender && applicable.gender[x])
      )
      const possibleNumbers = (
        applicable.number === false
          ? ['N/A' as NA]
          : ALL_NUMBERS.filter(x => applicable.number && applicable.number[x])
      )
      for (let i = 0; i < possibleNumbers.length; i++) {
        const number = possibleNumbers[i]
        for (const person of possiblePersons) {
          for (const gender of possibleGenders) {
            const pgn: PGN = {
              person,
              gender,
              number,
            }
            if (isValid(pgn, parsing) && hasSetPGN(pgn)) {
              result[i].push(pgn)
            }
          }
        }
      }
      return result
    },
    [applicable, isValid, parsing],
  )
  const correctAnswer = useMemo(
    () => getPartFromVerb(part, verb) as PGN,
    [part, verb],
  )
  const isCorrectOption = useCallback(
    (option: PGN) => Object.values(checkPGN(option, correctAnswer)).every(Boolean),
    [correctAnswer],
  )
  const isApplicableOption = useCallback(
    (option: PGN) => {
      return applicable && (
        option.person === 'N/A'
        || (applicable.person && applicable.person[option.person])
      ) && (
        option.gender === 'N/A'
        || (applicable.gender && applicable.gender[option.gender])
      ) && (
        option.number === 'N/A'
        || (applicable.number && applicable.number[option.number])
      )
    },
    [applicable],
  )

  return (
    <ToggleButtonGroup
      onChange={handleChange}
      value={value}
      exclusive
      disabled={
        !applicable
        && (!showAnswer || (part === 'suffix' && !verb.suffixParsing?.person))
      }
    >
      {pgnOptions.map(numberOptions => (
        <Stack key={numberOptions[0]?.number || ''}>
          {numberOptions.map((option, i) => option && (
            <ParsingControl
              key={getPGNKey(option)}
              disabled={!isApplicableOption(option)}
              doubleHeight={(
                option.person === 3
                && option.gender === 'c'
                && option.number === 'p'
              )}
              isCorrect={isCorrectOption(option) || false}
              isLast={i === numberOptions.length - 1}
              isFirst={i === 0}
              option={option}
              value={value}
              label={getPGNKey(option)}
              showAnswer={showAnswer}
            />
          ))}
        </Stack>
      ))}
    </ToggleButtonGroup>
  )
}

export default PGNGroup