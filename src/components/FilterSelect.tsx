import {
  Chip,
  MenuItem,
  SelectChangeEvent,
  SelectProps,
  Stack,
  TextField,
  Theme,
  useMediaQuery,
} from '@mui/material'
import { useCallback, useMemo, useState } from 'react'


function FilterSelect<T extends string>({
  disabled,
  fullWidth,
  getOptionLabel,
  label,
  onChange,
  options,
  value,
}: {
  disabled?: boolean,
  fullWidth?: boolean,
  getOptionLabel?: (option: T) => string,
  label: string,
  onChange: (newValue: T[]) => void,
  options: T[],
  value: T[],
}) {
  const [open, setOpen] = useState(false)
  const handleOpen = useCallback(() => setOpen(true), [])
  const handleClose = useCallback(() => setOpen(false), [])

  const handleChange = useCallback(
    (event: SelectChangeEvent<T[]>) => {
      const newValue = event.target.value
      if (Array.isArray(newValue)) {
        onChange(newValue)
      }
    },
    [onChange],
  )
  const deleteOption = useCallback(
    (option: T) => () => {
      const newValue = value.filter(v => v !== option)
      onChange(newValue)
    },
    [value, onChange],
  )

  const handleClickChip = useCallback(
    (option: T) => (event: React.MouseEvent<HTMLElement>) => {
      if (event.getModifierState('Control')) {
        const newValue = value.filter(v => v === option)
        onChange(newValue)
      } else {
        handleOpen()
      }
    },
    [handleOpen, onChange, value],
  )

  const handleClickOption = useCallback(
    (option: T) => (event: React.MouseEvent<HTMLElement>) => {
      if (event.getModifierState('Control')) {
        if (value.includes(option)) {
          if (value.length === 1) {
            onChange(options)
          } else {
            const newValue = value.filter(v => v === option)
            onChange(newValue)
          }
          event.preventDefault()
        } else {
          onChange([option])
        }
      }
    },
    [onChange, options, value],
  )

  const stopPropagaton = useCallback(
    (event: React.MouseEvent<HTMLElement>) => {
      event.stopPropagation()
    },
    [],
  )

  const xs = useMediaQuery<Theme>(theme => theme.breakpoints.only('xs'))
  const sm = useMediaQuery<Theme>(theme => theme.breakpoints.down('md'))
  const maxChips = useMemo(
    () => {
      if (xs) {
        return 2
      }
      if (sm) {
        return 3
      }
      return 5
    },
    [xs, sm]
  )

  return (
    <TextField
      disabled={disabled}
      fullWidth={fullWidth}
      select
      label={label}
      SelectProps={{
        variant: 'outlined',
        multiple: true,
        value: value,
        open: open,
        onOpen: handleOpen,
        onClose: handleClose,
        onChange: handleChange,
        renderValue: (selected: T[]) => (
          <Stack direction="row" spacing={1}>
            {selected.slice(0, maxChips).map(v => (
              <Chip
                key={v}
                label={getOptionLabel?.(v) || v}
                onClick={handleClickChip(v)}
                onDelete={deleteOption(v)}
                onMouseDown={stopPropagaton}
              />
            ))}

            {selected.length > maxChips && (
              <Chip
                label={`+${selected.length - maxChips}`}
                disabled
              />
            )}
          </Stack>
        ),
      } as SelectProps<T[]> as SelectProps}
    >
      {options.map(o => (
        <MenuItem
          key={o}
          value={o}
          onClick={handleClickOption(o)}
        >
          {getOptionLabel?.(o) || o}
        </MenuItem>
      ))}
    </TextField>
  )
}

export default FilterSelect
