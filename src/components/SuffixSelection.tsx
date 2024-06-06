import { ToggleButtonGroup } from '@mui/material'
import { useCallback } from 'react'
import type { LinkedOccurrence, VerbParsing } from '../loadData'
import { hasSetPGN } from '../util'
import ParsingControl from './ParsingControl'


export type Suffix = 'suffix' | 'no-suffix'

function SuffixSelection({
  disabled,
  onChange,
  showAnswer,
  suffix,
  occurrence,
  correctParsings,
}: {
  disabled: boolean,
  onChange: (suffix: Suffix) => void,
  showAnswer: boolean,
  suffix: Suffix,
  occurrence: LinkedOccurrence,
  correctParsings: VerbParsing[],
}) {
  const handleToggleSuffix = useCallback(
    (event: React.MouseEvent<HTMLElement>, newData: 'suffix' | 'no-suffix' | null) => {
      if (newData) {
        onChange(newData)
      }
    },
    [onChange],
  )
  const isCorrect = useCallback(
    (value: boolean) => {
      for (const parsing of occurrence.parsings) {
        if (hasSetPGN(parsing.suffix) === value) {
          return { match: true, exact: true }
        }
      }
      for (const correctParsing of correctParsings) {
        if (hasSetPGN(correctParsing.suffix) === value) {
          return { match: true, exact: false }
        }
      }
      return { match: false, exact: false }
    },
    [correctParsings, occurrence.parsings],
  )

  return (
    <ToggleButtonGroup
      disabled={disabled}
      exclusive
      orientation="vertical"
      onChange={handleToggleSuffix}
      value={suffix}
    >
      <ParsingControl
        isCorrect={isCorrect(false)}
        option="no-suffix"
        value={suffix}
        label="No Suffix"
        showAnswer={showAnswer}
      />
      <ParsingControl
        isCorrect={isCorrect(true)}
        option="suffix"
        value={suffix}
        label="Suffix"
        showAnswer={showAnswer}
      />
    </ToggleButtonGroup>
  )
}

export default SuffixSelection
