import {
  ToggleButtonGroup,
} from '@mui/material'
import { useCallback, useMemo } from 'react'
import { Parsing, PART_MAPPING, checkSimplePart, ApplicableParts, getSimplePartName, SimpleParsingPartKey, getPartFromVerb } from '../util'
import type { LinkedOccurrence, VerbParsing } from '../loadData'
import ParsingControl from './ParsingControl'


function ParsingControlGroup<P extends SimpleParsingPartKey, V extends Parsing[P]>({
  applicable,
  onChange,
  parsing,
  part,
  showAnswer,
  value,
  occurrence,
  correctParsings,
}: {
  applicable: ApplicableParts[P],
  onChange: (newValue: V) => void,
  parsing: Parsing,
  part: P,
  showAnswer: boolean,
  value: V,
  occurrence: LinkedOccurrence,
  correctParsings: [VerbParsing, number][],
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
    () => getPartFromVerb(part, occurrence.parsing) as V,
    [part, occurrence],
  )
  const isCorrectOption = useCallback(
    (option: V | 'N/A') => {
      const attempt = {
        ...parsing,
        [part]: option,
      }
      if (checkSimplePart<typeof part>(part, attempt, correctAnswer)) {
        return { match: true, exact: true }
      } else {
        for (const [correctParsing] of correctParsings) {
          if (checkSimplePart<typeof part>(part, attempt, correctParsing[part])) {
            return { match: true, exact: false }
          }
        }
      }
      return { match: false, exact: false }
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
          isCorrect={isCorrectOption(option)}
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
