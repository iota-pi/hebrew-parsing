import { Button, Divider, Typography } from '@mui/material'
import { Fragment, useCallback } from 'react'
import type { GroupMember } from '../state/people'
import { useAppSelector } from '../store'
import CustomPerson from './CustomPerson'
import sync from '../sync/sync'
import { NOT_IN_A_GROUP_ID } from '../constants'
import { getRandomId } from '../util'


function CustomPeople() {
  const customPeople = useAppSelector(state => state.people.customPeople)

  const handleChange = useCallback(
    (person: GroupMember) => (change: Partial<GroupMember>) => {
      sync.syncActions({
        type: 'updateCustom',
        person: person.responseId,
        content: change,
      })
    },
    [],
  )
  const handleDelete = useCallback(
    (person: GroupMember) => () => {
      sync.syncActions([
        {
          type: 'removeMember',
          member: person.responseId,
        },
        {
          type: 'removeCustom',
          person: person.responseId,
        },
      ])
    },
    [],
  )
  const handleDuplicate = useCallback(
    (person: GroupMember) => () => {
      sync.syncActions({
        type: 'duplicateCustom',
        person: person.responseId,
      })
    },
    [],
  )
  const handleAdd = useCallback(
    () => {
      const id = `c-${getRandomId()}`
      sync.syncActions([
        {
          type: 'addCustom',
          person: {
            firstName: '',
            lastName: '',
            ccbId: '',
            times: [],
            prayerTimes: [],
            comments: '',
            extraOptions: [],
            leader: true,
            prayerLeader: true,
            faculty: '',
            degree: '',
            gender: 'm',
            year: '',
            custom: true,
            responseId: id,
            previous: [],
          },
          context: {
            before: null,
            after: [],
          }
        },
        {
          type: 'addIfMissing',
          member: id,
          group: NOT_IN_A_GROUP_ID,
          context: {
            before: null,
            after: [],
          },
        },
      ])
    },
    [],
  )

  return (
    <>
      <div>
        <Typography variant="h5">
          Add People Manually
        </Typography>
        <Typography>
          <strong>Note:</strong> if people have registered late you can simply
          re-export and re-import the form responses.
          This is more intended for adding e.g. trainees as leaders.
        </Typography>
      </div>

      {customPeople.map(person => (
        <Fragment key={person.responseId}>
          <CustomPerson
            onChange={handleChange(person)}
            onDelete={handleDelete(person)}
            onDuplicate={handleDuplicate(person)}
            person={person}
          />

          <Divider />
        </Fragment>
      ))}

      <Button
        onClick={handleAdd}
        variant="outlined"
      >
        Add Person Manually
      </Button>
    </>
  )
}

export default CustomPeople
