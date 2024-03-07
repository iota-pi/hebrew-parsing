import { Box, Collapse } from '@mui/material'
import { memo, useMemo } from 'react'
import { BibleGroup } from '../state/groups'
import { GroupMember } from '../state/people'
import { useAppSelector } from '../store'
import {
  canJoinGroup,
  compareTimes,
  getTimeId,
} from '../util'
import { COLLAPSED_WIDTH, NORMAL_WIDTH } from './GroupSet'

export interface Props {
  after?: boolean,
  draggedFrom: BibleGroup | undefined,
  dragging: GroupMember[],
  groupSet: BibleGroup[],
}

const GroupSetSpacer = memo(({
  after,
  draggedFrom,
  dragging,
  groupSet,
}: Props) => {
  const firstGroup = groupSet[0]
  const groupType = useAppSelector(state => state.groupType)
  const disableDrop = useMemo(
    () => dragging.some(person => !canJoinGroup({ group: firstGroup, person, groupType })),
    [dragging, firstGroup, groupType],
  )
  const time = firstGroup.time
  const isBeforeDragged = draggedFrom && compareTimes(time, draggedFrom.time) < 0
  const isAfterDragged = draggedFrom && compareTimes(time, draggedFrom.time) > 0
  const show = disableDrop && (after ? isAfterDragged : isBeforeDragged)

  return (
    <Box key={getTimeId(time)}>
      <Collapse
        orientation="horizontal"
        in={show}
      >
        <Box minWidth={NORMAL_WIDTH - COLLAPSED_WIDTH} />
      </Collapse>
    </Box>
  )
})
GroupSetSpacer.displayName = 'GroupSetSpacer'

export default GroupSetSpacer
