import {
  ToggleButtonGroup,
} from '@mui/material'
import {
  useCallback,
} from 'react'
import type { VerbParsing } from '../loadData'
import { hasSetPGN } from '../util'
import ParsingControl from './ParsingControl'


export type Suffix = 'suffix' | 'no-suffix'

function SuffixSelection({
  disabled,
  onChange,
  showAnswer,
  suffix,
  parsing,
}: {
  disabled: boolean,
  onChange: (suffix: Suffix) => void,
  showAnswer: boolean,
  suffix: Suffix,
  parsing: VerbParsing,
}) {
  const handleToggleSuffix = useCallback(
    (event: React.MouseEvent<HTMLElement>, newData: 'suffix' | 'no-suffix' | null) => {
      if (newData) {
        onChange(newData)
      }
    },
    [onChange],
  )
  const hasSuffix = hasSetPGN(parsing.suffix)

  return (
    <ToggleButtonGroup
      disabled={disabled}
      exclusive
      orientation="vertical"
      onChange={handleToggleSuffix}
      value={suffix}
    >
      <ParsingControl
        isCorrect={!hasSuffix}
        option="no-suffix"
        value={suffix}
        label="No Suffix"
        showAnswer={showAnswer}
      />
      <ParsingControl
        isCorrect={hasSuffix}
        option="suffix"
        value={suffix}
        label="Suffix"
        showAnswer={showAnswer}
      />
    </ToggleButtonGroup>
  )
}

export default SuffixSelection
