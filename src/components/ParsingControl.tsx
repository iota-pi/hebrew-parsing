import {
  ToggleButton,
} from '@mui/material'
import { getPGNKey } from '../util'
import { PGN } from '../../lambda/data'


function ParsingControl<T extends string | number | PGN>({
  disabled,
  doubleHeight,
  isCorrect,
  isFirst,
  isLast,
  option,
  value,
  label,
  showAnswer,
}: {
  disabled?: boolean,
  doubleHeight?: boolean,
  isCorrect: boolean,
  isFirst?: boolean,
  isLast?: boolean,
  option: T,
  value: T,
  label: string,
  showAnswer: boolean,
}) {
  if (option === null) {
    return null
  }
  const selected = (
    typeof value === 'object' && typeof option === 'object'
      ? getPGNKey(value) === getPGNKey(option)
      : value === option
  )
  return (
    <ToggleButton
      value={option}
      selected={
        !disabled
        && (selected || (showAnswer && isCorrect))
      }
      color={(
        showAnswer
          ? (
            isCorrect
              ? selected ? 'success' : 'info'
              : 'error'
          )
          : undefined
      )}
      sx={{
        marginTop: isFirst === false ? '-1px' : undefined,
        borderTopColor: isFirst === false ? 'transparent' : undefined,
        borderBottomLeftRadius: isLast === false ? 0 : undefined,
        borderBottomRightRadius: isLast === false ? 0 : undefined,
        borderTopLeftRadius: isFirst === false ? 0 : undefined,
        borderTopRightRadius: isFirst === false ? 0 : undefined,
        height: doubleHeight ? `${48.1 * 2 - 1}px` : undefined,
      }}
      disabled={
        disabled
        || showAnswer
      }
    >
      {label}
    </ToggleButton>
  )
}

export default ParsingControl
