import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Divider, Stack, styled, Typography } from '@mui/material'
import { green } from '@mui/material/colors'
import { Fragment, memo, useMemo } from 'react'
import { BibleGroup } from '../state/groups'
import { GroupMember, MissingGroupMember } from '../state/people'
import { usePeopleMap } from '../state/selectors'
import { canJoinGroup, isLeader } from '../util'
import GroupHeader from './GroupHeader'
import { DraggablePerson, PlaceholderPerson } from './DraggablePerson'
import { useAppSelector } from '../store'

interface ExtraContainerProps {
  disableDrop: boolean,
  hovering: boolean,
  isDragging: boolean,
}
const extraContainerPropNames: PropertyKey[] = ['disableDrop', 'isDragging', 'hovering']

const GroupContainer = styled(
  Stack,
  {
    shouldForwardProp: prop => !extraContainerPropNames.includes(prop),
  },
)<ExtraContainerProps>(({ disableDrop, hovering, isDragging, theme }) => ({
  position: 'relative',
  transition: theme.transitions.create(
    ['opacity', 'background-color'],
    { duration: theme.transitions.duration.shorter },
  ),
  opacity: isDragging && disableDrop ? 0.3 : undefined,
  backgroundColor: hovering && !disableDrop ? green[100] : undefined,
  padding: theme.spacing(0.5),
  borderRadius: theme.spacing(0.5),
  borderWidth: 2,
  borderStyle: 'solid',
  borderColor: 'rgba(0, 0, 0, 0.15)',
}))

export interface Props {
  dragging: GroupMember[],
  group: BibleGroup,
  hovering: boolean,
  onRemove?: (groupId: string) => void,
}

const GroupDisplay = memo(({ dragging, group, hovering, onRemove }: Props) => {
  const peopleMap = usePeopleMap()
  const groupType = useAppSelector(state => state.groupType)
  const members: (GroupMember | MissingGroupMember)[] = useMemo(
    () => group.members.map(
      id => peopleMap.get(id) || { responseId: id, missing: true },
    ),
    [group.members, peopleMap],
  )
  const hasLeader = members.findIndex(m => isLeader(m)) === 0
  const firstNonLeader = members.findIndex(m => !isLeader(m))

  const disableDrop = useMemo(
    () => dragging.some(person => !canJoinGroup({ group, person, groupType })),
    [dragging, group, groupType],
  )

  return (
    <GroupContainer
      disableDrop={disableDrop}
      hovering={hovering}
      isDragging={dragging.length > 0}
    >
      <GroupHeader
        group={group}
        onRemove={onRemove}
      />

      <div>
        <Divider>
          <Typography
            variant="caption"
            fontWeight={hasLeader ? 700 : undefined}
          >
            {hasLeader ? 'Leaders' : 'Members'}
          </Typography>
        </Divider>

        {group.members.length > 0 && (
          <SortableContext
            items={group.members}
            strategy={verticalListSortingStrategy}
          >
            <div>
              {members.map((member, index) => (
                <Fragment key={member.responseId}>
                  <DraggablePerson person={member} />

                  {index === firstNonLeader - 1 && (
                    <Divider>
                      <Typography variant="caption">Members</Typography>
                    </Divider>
                  )}
                </Fragment>
              ))}
            </div>
          </SortableContext>
        )}

        {members.length === 0 && (
          <PlaceholderPerson
            emptyLabel="leaders"
            groupId={group.id}
          />
        )}
      </div>
    </GroupContainer>
  )
})
GroupDisplay.displayName = 'GroupDisplay'

export default GroupDisplay
