import { Box, Checkbox, FormControlLabel, Grid, IconButton, MenuItem, TextField, Tooltip } from '@mui/material'
import { useCallback, ChangeEvent, useState, useEffect } from 'react'
import { GroupMember } from '../state/people'
import { DeleteIcon, DuplicateIcon } from './Icons'
import { isLeader } from '../util'


export interface Props {
  onChange: (person: Partial<GroupMember>) => void,
  onDelete: () => void,
  onDuplicate: () => void,
  person: GroupMember,
}

function getName(person: Pick<GroupMember, 'firstName' | 'lastName'>) {
  return `${person.firstName}${person.lastName ? ' ' : ''}${person.lastName}`
}

function CustomPerson({ onChange, onDelete, onDuplicate, person }: Props) {
  const [localName, setLocalName] = useState(getName(person))
  const [nameJustChanged, setNameJustChanged] = useState(false)

  const handleChangeId = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      onChange({ ccbId: event.target.value })
    },
    [onChange],
  )
  const handleChangeGender = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      onChange({ gender: event.target.value as 'm' | 'f' })
    },
    [onChange],
  )
  const handleChangeName = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setLocalName(event.target.value)
      setNameJustChanged(true)
    },
    [],
  )
  const currentlyLeader = isLeader(person)
  const handleChangeLeader = useCallback(
    () => onChange({ leader: !currentlyLeader, prayerLeader: !currentlyLeader }),
    [onChange, currentlyLeader],
  )

  useEffect(
    () => {
      setLocalName(getName({
        firstName: person.firstName,
        lastName: person.lastName,
      }))
    },
    [person.firstName, person.lastName],
  )
  useEffect(
    () => {
      const timeout = setTimeout(
        () => {
          if (nameJustChanged) {
            setNameJustChanged(false)
            const nameParts = localName.split(/\s+/, 2)
            if (!nameParts[1]) {
              onChange({ firstName: localName, lastName: '' })
            } else {
              onChange({
                firstName: nameParts[0],
                lastName: nameParts[1],
              })
            }
          }
        },
        500,
      )
      return () => clearTimeout(timeout)
    },
    [localName, nameJustChanged, onChange],
  )

  return (
    <div>
      <Grid container spacing={1.5}>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="CCB ID"
            onChange={handleChangeId}
            value={person.ccbId}
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Name"
            onChange={handleChangeName}
            value={localName}
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Gender"
            onChange={handleChangeGender}
            select
            value={person.gender}
          >
            <MenuItem value="m">Male</MenuItem>
            <MenuItem value="f">Female</MenuItem>
          </TextField>
        </Grid>

        <Grid item xs={12} sm={6}>
          <Box
            display="flex"
            justifyContent="space-between"
            paddingY={{ xs: 0, sm: 1 }}
          >
            <FormControlLabel
              control={(
                <Checkbox
                  checked={currentlyLeader}
                  onClick={handleChangeLeader}
                />
              )}
              label="Leader"
            />

            <div>
              <Tooltip title="Duplicate">
                <IconButton onClick={onDuplicate}>
                  <DuplicateIcon />
                </IconButton>
              </Tooltip>

              <Tooltip title="Delete">
                <IconButton onClick={onDelete}>
                  <DeleteIcon />
                </IconButton>
              </Tooltip>
            </div>
          </Box>
        </Grid>
      </Grid>
    </div>
  )
}

export default CustomPerson
