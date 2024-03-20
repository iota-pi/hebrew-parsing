import {
  Stack,
  ToggleButtonGroup,
} from '@mui/material'
import { Parsing, PART_MAPPING, ParsingKey, checkSimplePart, getPartFromVerb, ApplicableParts, getSimplePartName, SimpleParsingPartKey, checkPGN, getPGNName, isSimplePart } from './components/pages/util'
import type { PGN, Stem, Tense, Verb } from '../lambda/data'
import { useCallback, useMemo } from 'react'
import ParsingControl from './ParsingControl'


function ParsingControlGroup<P extends ParsingKey, V extends Parsing[P]>({
  verb,
  part,
  value,
  applicable,
  showAnswer,
  onChange,
}: {
  applicable: ApplicableParts[P],
  verb: Verb,
  part: P,
  value: V,
  showAnswer: boolean,
  onChange: (newValue: V) => void,
}) {
  const handleToggle = useCallback(
    (key?: keyof PGN) => (
      (event: React.MouseEvent<HTMLElement>, newData: V) => {
        console.log('aaa', newData)
        if (newData) {
          if (isSimplePart(part)) {
            onChange(newData)
          } else if (key) {
            console.log('newData', newData)
            onChange({
              ...(value as PGN),
              [key]: newData,
            } as V)
          }
        }
      }
    ),
    [part, value],
  )

  const mapping = PART_MAPPING[part]
  const correctAnswer = useMemo(
    () => getPartFromVerb(part, verb) as V,
    [part, verb],
  )
  const isCorrectSimpleOption = useCallback(
    (option: Stem | Tense) => {
      return checkSimplePart(option, correctAnswer as typeof option)
    },
    [correctAnswer],
  )
  const isCorrectPGNOption = useCallback(
    (key: keyof PGN) => {
      return checkPGN(value as PGN, correctAnswer as PGN)[key]
    },
    [value],
  )

  return (
    Array.isArray(mapping) ? (
      <ToggleButtonGroup
        onChange={handleToggle()}
        orientation='vertical'
        exclusive={!showAnswer}
        value={value}
        disabled={
          !applicable
        }
      >
        {mapping.map(option => option && (
          <ParsingControl
            key={option}
            applicable={applicable as Record<typeof option, boolean> | false}
            isCorrect={isCorrectSimpleOption(option) || false}
            option={option}
            value={value as typeof option}
            label={getSimplePartName(part as SimpleParsingPartKey, option)}
            showAnswer={showAnswer}
          />
        ))}
      </ToggleButtonGroup>
    ) : (
      <Stack direction="row" spacing={2}>
        {(['person', 'gender', 'number'] as (keyof PGN)[]).map((key => (
          <ToggleButtonGroup
            key={key}
            onChange={handleToggle(key)}
            orientation='vertical'
            exclusive={!showAnswer}
            value={(value as PGN)[key]}
            disabled={
              !applicable
              && (!showAnswer || (part === 'suffix' && !verb.suffixParsing?.person))
            }
          >
            {mapping[key].map(option => option && (
              <ParsingControl
                key={option}
                applicable={(
                  applicable && (applicable as Record<keyof PGN, Record<typeof option, boolean> | false>)[key]
                )}
                isCorrect={isCorrectPGNOption('person') || false}
                option={option}
                value={(value as PGN)[key]}
                label={getPGNName(key, option)}
                showAnswer={showAnswer}
              />
            ))}
          </ToggleButtonGroup>
        )))}
      </Stack>
    )
  )
}

export default ParsingControlGroup
