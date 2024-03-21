import {
  ToggleButtonGroup,
} from '@mui/material'
import { Parsing, PART_MAPPING, checkSimplePart, getPartFromVerb, ApplicableParts, getSimplePartName, SimpleParsingPartKey } from './util'
import type { Stem, Tense, Verb } from '../lambda/data'
import { useCallback, useMemo } from 'react'
import ParsingControl from './ParsingControl'


function ParsingControlGroup<P extends SimpleParsingPartKey, V extends Parsing[P]>({
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
    (event: React.MouseEvent<HTMLElement>, newData: V) => {
      if (newData) {
        onChange(newData)
      }
    },
    [part, value],
  )

  const mapping = PART_MAPPING[part] as V[]
  const correctAnswer = useMemo(
    () => getPartFromVerb(part, verb) as V,
    [part, verb],
  )
  const isCorrectSimpleOption = useCallback(
    (option: Stem | Tense | 'N/A') => {
      return checkSimplePart(option, correctAnswer as typeof option)
    },
    [correctAnswer],
  )

  return (
    <ToggleButtonGroup
      onChange={handleToggle}
      orientation='vertical'
      exclusive
      value={value}
      disabled={
        !applicable
      }
    >
      {mapping.map(option => option && (
        <ParsingControl
          key={option}
          disabled={!applicable || !(applicable as Record<typeof option, boolean>)[option]}
          isCorrect={isCorrectSimpleOption(option) || false}
          option={option}
          value={value}
          label={getSimplePartName(part as SimpleParsingPartKey, option)}
          showAnswer={showAnswer}
        />
      ))}
    </ToggleButtonGroup>
  )
}

export default ParsingControlGroup
