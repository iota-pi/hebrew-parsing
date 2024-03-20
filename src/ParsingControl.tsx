import {
  ToggleButton,
} from '@mui/material'


function ParsingControl<T extends string | number>({
  applicable,
  isCorrect,
  option,
  value,
  label,
  showAnswer,
}: {
  applicable: Record<T, boolean> | false,
  isCorrect: boolean,
  option: T | null,
  value: T | null,
  label: string,
  showAnswer: boolean,
}) {
  if (option === null) {
    return null
  }
  return (
    <ToggleButton
      key={option}
      value={option}
      selected={
        applicable
        && (value === option || (showAnswer && isCorrect))
        && (applicable as Record<typeof option, boolean>)[option]
      }
      color={(
        showAnswer
          ? (
            isCorrect
              ? value === option ? 'success' : 'info'
              : 'error'
          )
          : undefined
      )}
      // sx={{
      //   color: (
      //     showAnswer
      //     && isCorrect
      //     && value !== option
      //   ) ? 'success.main' : undefined
      // }}
      disabled={
        !applicable || applicable[option as unknown as keyof typeof applicable] === false
        && !showAnswer
      }
    >
      {label}
    </ToggleButton>
  )
}

export default ParsingControl
