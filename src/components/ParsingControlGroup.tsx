import {
  ToggleButtonGroup,
} from '@mui/material'
import { useCallback, useMemo } from 'react'
import { Parsing, PART_MAPPING, checkSimplePart, getPartFromVerb, ApplicableParts, getSimplePartName, SimpleParsingPartKey } from '../util'
import type { Verb } from '../../lambda/data'
import ParsingControl from './ParsingControl'


function ParsingControlGroup<P extends SimpleParsingPartKey, V extends Parsing[P]>({
  applicable,
  onChange,
  parsing,
  part,
  showAnswer,
  value,
  verb,
}: {
  applicable: ApplicableParts[P],
  onChange: (newValue: V) => void,
  parsing: Parsing,
  part: P,
  showAnswer: boolean,
  value: V,
  verb: Verb,
}) {
  const handleToggle = useCallback(
    (event: React.MouseEvent<HTMLElement>, newData: V) => {
      if (newData) {
        onChange(newData)
      }
    },
    [onChange],
  )

  const mapping = PART_MAPPING[part] as V[]
  const correctAnswer = useMemo(
    () => getPartFromVerb(part, verb) as V,
    [part, verb],
  )
  const isCorrectSimpleOption = useCallback(
    (option: V | 'N/A') => {
      const attempt = {
        ...parsing,
        [part]: option,
      }
      return checkSimplePart<typeof part>(part, attempt, correctAnswer)
    },
    [correctAnswer, parsing, part],
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
