import {
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material'
import {
  useCallback,
} from 'react'
import type { Verb } from '../../lambda/data'
import { hasSetPGN } from '../util'


export type Suffix = 'suffix' | 'no-suffix'

function SuffixSelection({
  disabled,
  onChange,
  showAnswer,
  suffix,
  verb,
}: {
  disabled: boolean,
  onChange: (suffix: Suffix) => void,
  showAnswer: boolean,
  suffix: Suffix,
  verb: Verb,
}) {
  const handleToggleSuffix = useCallback(
    (event: React.MouseEvent<HTMLElement>, newData: 'suffix' | 'no-suffix') => {
      onChange(newData)
    },
    [],
  )
  const hasSuffix = hasSetPGN(verb.suffixParsing)

  return (
    <ToggleButtonGroup
      disabled={disabled}
      exclusive
      orientation="vertical"
      onChange={handleToggleSuffix}
      value={suffix}
    >
      <ToggleButton
        value="no-suffix"
        selected={(
          suffix === 'no-suffix'
          || (showAnswer && !hasSuffix)
        )}
        color={(
          showAnswer
            ? (
              suffix === 'no-suffix'
                ? !hasSuffix ? 'success' : 'error'
                : !hasSuffix ? 'info' : undefined
            )
            : undefined
        )}
      >
        No Suffix
      </ToggleButton>
      <ToggleButton
        value="suffix"
        selected={(
          suffix === 'suffix'
          || (showAnswer && hasSuffix)
        )}
        color={(
          showAnswer
            ? (
              suffix === 'suffix'
                ? hasSuffix ? 'success' : 'error'
                : hasSuffix ? 'info' : undefined
            )
            : undefined
        )}
      >
        Suffix
      </ToggleButton>
    </ToggleButtonGroup>
  )
}

export default SuffixSelection
