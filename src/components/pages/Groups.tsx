import { styled } from '@mui/material'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getPage } from '.'
import { performAutoGenerate } from '../../autogenerate/autoGenerate'
import { BibleGroups } from '../../state/groups'
import { GroupMember } from '../../state/people'
import {
  useFilteredPeople,
  useGroupTimeOptions,
  usePeopleMap,
} from '../../state/selectors'
import { useAppSelector } from '../../store'
import sync from '../../sync/sync'
import {
  isDefined,
  NOT_IN_A_GROUP_ID,
} from '../../util'
import ConfirmationDialog from '../dialogs/ConfirmationDialog'
import GroupsControl from '../GroupsControl'

const Container = styled('div')(({ theme }) => ({
  padding: theme.spacing(1),
}))

function GroupsPage() {
  const groups = useAppSelector(state => state.groups.groups)
  const groupType = useAppSelector(state => state.groupType)
  const navigate = useNavigate()
  const filteredPeople = useFilteredPeople(groupType)
  const peopleMap = usePeopleMap()
  const allPossibleTimes = useGroupTimeOptions(true)

  const [showConfirm, setShowConfirm] = useState(false)
  const handleClickGenerate = useCallback(() => setShowConfirm(true), [])
  const handleCloseConfirm = useCallback(() => setShowConfirm(false), [])

  const callAutoGenerate = useCallback(
    (peopleToAssign: GroupMember[], initialGroups: BibleGroups) => {
      performAutoGenerate({
        peopleToAssign,
        initialGroups,
        groupType,
        allPossibleTimes,
        sync,
        peopleMap,
      })
      setShowConfirm(false)
    },
    [allPossibleTimes, groupType, peopleMap],
  )

  const handleGenerate = useCallback(
    () => {
      callAutoGenerate(filteredPeople, {})
    },
    [callAutoGenerate, filteredPeople],
  )

  const handleAssign = useCallback(
    () => {
      const idsToAssign = groups[NOT_IN_A_GROUP_ID].members || []
      const peopleToAssign = idsToAssign?.map(m => peopleMap.get(m)).filter(isDefined)
      callAutoGenerate(peopleToAssign, groups)
    },
    [callAutoGenerate, groups, peopleMap],
  )

  useEffect(
    () => {
      if (filteredPeople.length === 0) {
        navigate(getPage('data').path, { replace: true })
      }
    },
    [navigate, filteredPeople],
  )

  return (
    <Container>
      <GroupsControl
        onGenerate={handleClickGenerate}
        onAssign={handleAssign}
      />

      <ConfirmationDialog
        open={showConfirm}
        onCancel={handleCloseConfirm}
        onConfirm={handleGenerate}
      >
        <p>Are you sure you want to auto-generate the groups?</p>
        <p>This will overwrite the current group arrangements</p>
      </ConfirmationDialog>
    </Container>
  )
}

export default GroupsPage
