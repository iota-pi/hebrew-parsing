import { useDroppable } from '@dnd-kit/core'
import { Button, styled } from '@mui/material'
import { green } from '@mui/material/colors'
import { memo, useCallback, useMemo } from 'react'
import { useAppSelector } from '../store'
import { GroupMember, GroupTime } from '../state/people'
import { canJoinTime, getTimeId } from '../util'

export interface Props {
  dragging: GroupMember[],
  hovering: boolean,
  onAdd: (time: GroupTime) => void,
  time: GroupTime,
}

interface ExtraContainerProps {
  disableDrop: boolean,
  hovering: boolean,
  isDragging: boolean,
}

const extraContainerPropNames: PropertyKey[] = ['disableDrop', 'isDragging', 'hovering']

const StyledButton = styled(
  Button,
  {
    shouldForwardProp: prop => !extraContainerPropNames.includes(prop),
  },
)<ExtraContainerProps>(({ disableDrop, hovering, isDragging, theme }) => ({
  transition: theme.transitions.create(
    ['opacity', 'background-color'],
    { duration: theme.transitions.duration.shorter },
  ),
  opacity: isDragging && disableDrop ? 0.3 : undefined,
  backgroundColor: hovering && !disableDrop ? green[100] : undefined,
}))

const AddGroupButton = memo(({
  onAdd,
  dragging,
  time,
  hovering,
}: Props) => {
  const {
    setNodeRef,
  } = useDroppable({
    id: `add-${getTimeId(time)}`,
  })

  const groupType = useAppSelector(state => state.groupType)
  const disableDrop = useMemo(
    () => dragging.some(person => !canJoinTime({ person, time, groupType })),
    [dragging, groupType, time],
  )

  const handleClickAdd = useCallback(() => onAdd(time), [onAdd, time])

  return (
    <StyledButton
      disableDrop={disableDrop}
      hovering={hovering}
      isDragging={!!dragging}
      onClick={handleClickAdd}
      ref={setNodeRef}
      variant="outlined"
    >
      +
    </StyledButton>
  )
})
AddGroupButton.displayName = 'AddGroupButton'

export default AddGroupButton
