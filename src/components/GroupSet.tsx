import { Box, Button, Collapse, IconButton, Stack, Typography } from '@mui/material'
import { memo, useCallback, useMemo } from 'react'
import { BibleGroup } from '../state/groups'
import { GroupMember, GroupTime } from '../state/people'
import { usePeopleMap } from '../state/selectors'
import { setHighlightTime } from '../state/ui'
import { useAppDispatch, useAppSelector } from '../store'
import {
  canJoinGroup,
  getTimeId,
  isDefined,
  NOT_IN_A_GROUP_ID,
  prettyCampusName,
  prettyTimeString,
} from '../util'
import AddGroupButton from './AddGroupButton'
import GroupDisplay from './GroupDisplay'
import { ChevronLeftIcon, HiddenIcon, ResetIcon, VisibleIcon } from './Icons'

export const NORMAL_WIDTH = 200
export const COLLAPSED_WIDTH = 50

export interface Props {
  dragging: GroupMember[],
  groupSet: BibleGroup[],
  hoveredGroup: string | undefined,
  onAdd: (time: GroupTime, groupSet: BibleGroup[]) => void,
  onAssign?: () => void,
  onGenerate?: () => void,
  onRemove: (groupId: string) => void,
  showCampusSpacing: boolean,
}

export const ADD_GROUP_PREFIX = 'add-'

const GroupSet = memo(({
  dragging,
  groupSet,
  hoveredGroup,
  onAdd,
  onAssign,
  onGenerate,
  onRemove,
  showCampusSpacing,
}: Props) => {
  const dispatch = useAppDispatch()
  const groupType = useAppSelector(state => state.groupType)
  const highlightTime = useAppSelector(state => state.ui.highlightTime)
  const peopleMap = usePeopleMap()

  const firstGroup = groupSet[0]
  const time = firstGroup.time
  const isHighlighted = !!highlightTime && getTimeId(highlightTime) === getTimeId(time)
  const realGroupSet = firstGroup.id !== NOT_IN_A_GROUP_ID

  const handleAdd = useCallback(
    () => onAdd(time, groupSet),
    [groupSet, onAdd, time],
  )
  const handleClickHighlightTime = useCallback(
    () => dispatch(setHighlightTime(isHighlighted ? null : time)),
    [dispatch, isHighlighted, time],
  )

  const disableDrop = useMemo(
    () => dragging.some(person => !canJoinGroup({ group: firstGroup, person, groupType })),
    [dragging, firstGroup, groupType],
  )

  const addButtonId = `${ADD_GROUP_PREFIX}${getTimeId(time)}`
  const assignableMembers = useMemo(
    () => (
      groupSet[0].id === NOT_IN_A_GROUP_ID
        ? groupSet[0].members.map(m => peopleMap.get(m)).filter(isDefined)
        : []
    ),
    [groupSet, peopleMap],
  )

  return (
    <div key={getTimeId(time)}>
      <Collapse
        orientation="horizontal"
        in={!disableDrop}
        collapsedSize={COLLAPSED_WIDTH}
      >
        <Stack spacing={1} minWidth={NORMAL_WIDTH}>
          <Box
            alignItems="center"
            display="flex"
            minHeight={40}
            onClick={handleClickHighlightTime}
          >
            <Box minHeight={showCampusSpacing ? 48 : undefined} flexGrow={1}>
              <Typography fontWeight={isHighlighted ? 700 : undefined}>
                {prettyTimeString(time.time)}
              </Typography>

              {time.campus !== 'main' && (
                <Typography variant="caption">
                  {prettyCampusName(time.campus)}
                </Typography>
              )}
            </Box>

            {realGroupSet && (
              <IconButton
                onClick={handleClickHighlightTime}
                color="success"
              >
                {isHighlighted ? <HiddenIcon /> : <VisibleIcon />}
              </IconButton>
            )}
          </Box>

          {groupSet[0].id === NOT_IN_A_GROUP_ID && (
            <>
              <Button
                onClick={onGenerate}
                startIcon={<ResetIcon />}
                variant="outlined"
              >
                Re-create all groups
              </Button>

              <Button
                disabled={assignableMembers.length === 0}
                onClick={onAssign}
                startIcon={<ChevronLeftIcon />}
                variant="outlined"
              >
                Assign to groups
              </Button>
            </>
          )}

          {groupSet.map(group => (
            <GroupDisplay
              key={group.id}
              hovering={hoveredGroup === group.id}
              dragging={dragging}
              group={group}
              onRemove={group.id !== NOT_IN_A_GROUP_ID ? onRemove : undefined}
            />
          ))}

          {realGroupSet && (
            <AddGroupButton
              onAdd={handleAdd}
              time={time}
              dragging={dragging}
              hovering={hoveredGroup === addButtonId}
            />
          )}
        </Stack>
      </Collapse>
    </div>
  )
})
GroupSet.displayName = 'GroupSet'

export default GroupSet
