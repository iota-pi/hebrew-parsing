import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  closestCenter,
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  MeasuringConfiguration,
  MouseSensor,
  PointerActivationConstraint,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { Divider, Stack, SxProps } from '@mui/material'
import type { BibleGroup, BibleGroups } from '../state/groups'
import type { GroupMember, GroupTime } from '../state/people'
import { usePeopleMap } from '../state/selectors'
import { useAppSelector } from '../store'
import {
  canJoinGroup,
  canJoinTime,
  compareGroupsByTime,
  compareGroupSetsByTime,
  getBlankGroup,
  getGroupId,
  getTimeId,
  NOT_IN_A_GROUP_ID,
  sortMemberIds,
} from '../util'
import GroupSet, { ADD_GROUP_PREFIX } from './GroupSet'
import { PersonDisplay } from './DraggablePerson'
import GroupSetSpacer from './GroupSetSpacer'
import sync from '../sync/sync'
import type {
  BGFGroupAction,
  MoveMemberAction,
  SortMembersAction,
} from '../sync/bgfActions'
import { applyGroupActions, createContext } from '../sync/applyAction'

const findGroupId = (groups: BibleGroups, id: string) => (
  groups[id]?.id || Object.values(groups).find(g => g.members.includes(id))?.id
)

// DnD contants
const activationConstraint: PointerActivationConstraint = { distance: 3 }
const measuring: MeasuringConfiguration = {
  droppable: {
    frequency: 100,
  },
}
const noSelectStyle: SxProps = { userSelect: 'none' }

function GroupsControl({
  onAssign,
  onGenerate,
}: {
  onAssign: () => void,
  onGenerate: () => void,
}) {
  const groups = useAppSelector(state => state.groups.groups)
  const groupType = useAppSelector(state => state.groupType)
  const peopleMap = usePeopleMap()

  const [dragging, setDragging] = useState<GroupMember[]>([])
  const [draggedFrom, setDraggedFrom] = useState<BibleGroup>()
  const [hoveredGroup, setHoveredGroup] = useState<string>()
  const [localGroups, setLocalGroups] = useState<BibleGroups>(groups)
  const recentlyMovedToNewGroup = useRef(false)

  useEffect(
    () => {
      setLocalGroups(groups)
    },
    [groups],
  )

  const groupSets: BibleGroup[][] = useMemo(
    () => {
      const groupMap = new Map<string, BibleGroup[]>()
      for (const group of Object.values(localGroups)) {
        const groupSet = groupMap.get(getTimeId(group.time))
        if (groupSet) {
          groupSet.push(group)
        } else {
          groupMap.set(getTimeId(group.time), [group])
        }
      }
      groupMap.forEach(groupSet => groupSet.sort(compareGroupsByTime))
      return [
        ...Array.from(groupMap.values()).sort(compareGroupSetsByTime),
      ]
    },
    [localGroups],
  )

  const handleClickRemove = useCallback(
    (groupId: string) => {
      const group = groups[groupId]
      if (group) {
        const time = `${group.time.day} ${group.time.time}`
        const groupsWithSameTime = (
          Object.values(groups).filter(g => `${g.time.day} ${g.time.time}` === time)
        )
        if (groupsWithSameTime.length > 1) {
          sync.syncActions([{ type: 'removeGroup', group: groupId }])
        } else {
          sync.syncActions([{ type: 'clearGroup', group: groupId }])
        }
      } else {
        console.warn('Attempted to remove group with non-existent id')
      }
    },
    [groups],
  )
  const getNewGroup = useCallback(
    (time: GroupTime, groupSet: BibleGroup[]) => {
      const index = Math.max(
        ...groupSet.map(group => parseInt(group.id.replace(/.*\D(\d+)$/, '$1'))),
      ) + 1
      const groupId = getGroupId(time, index)
      const newGroup = getBlankGroup(groupId, time)
      return { ...newGroup }
    },
    [],
  )
  const handleAdd = useCallback(
    (time: GroupTime, groupSet: BibleGroup[]) => {
      sync.syncActions([
        {
          type: 'addGroup',
          group: getNewGroup(time, groupSet),
        },
      ])
    },
    [getNewGroup],
  )

  const handleDrag = useCallback(
    (event: DragStartEvent) => {
      const draggingId = event.active.id.toString()
      const person = peopleMap.get(draggingId)
      setDragging(person ? [person] : [])
      const groupId = findGroupId(localGroups, draggingId)
      if (groupId) {
        setHoveredGroup(groupId)
        setDraggedFrom(localGroups[groupId])
      }
    },
    [peopleMap, localGroups],
  )
  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      // Note:
      //  - "active" is the person currently being dragged
      //  - "over" is either the group OR person which the dragged person is hovering over
      const { active, over } = event
      if (!over) {
        return
      }
      if (recentlyMovedToNewGroup.current) {
        // This seems to avoid https://github.com/clauderic/dnd-kit/issues/496
        return
      }

      const activeGroupId = findGroupId(localGroups, active.id.toString())
      const overGroupId = findGroupId(localGroups, over.id.toString())

      const activeGroup = activeGroupId ? localGroups[activeGroupId] : undefined
      const overGroup = overGroupId ? localGroups[overGroupId] : undefined
      setHoveredGroup(overGroup?.id.toString() || over.id.toString())
      if (!activeGroup || !overGroup || activeGroupId === overGroupId) {
        return
      }

      const activePerson = peopleMap.get(active.id.toString())
      if (!canJoinGroup({ group: overGroup, person: activePerson, groupType })) {
        return
      }

      const overIndex = overGroup.members.indexOf(over.id.toString())
      let newIndex
      if (overGroup.id === over.id || overIndex === -1) {
        newIndex = overGroup.members.length
      } else {
        const activeIsBelowOver = !!(
          active.rect.current.translated
          && active.rect.current.translated.top > over.rect.top + over.rect.height
        )
        newIndex = overIndex + +activeIsBelowOver
      }

      const action: MoveMemberAction = {
        type: 'moveMember',
        member: active.id.toString(),
        context: createContext({
          array: overGroup.members,
          index: newIndex,
          item: (activePerson!).responseId,
        }),
        group: overGroup.id,
      }
      // We don't need to sync this change; only apply it locally
      // The change will be synced in the *drop* event
      setLocalGroups(lg => applyGroupActions(lg, action))
      recentlyMovedToNewGroup.current = true
    },
    [groupType, localGroups, peopleMap],
  )
  const handleDrop = useCallback(
    (event: DragEndEvent) => {
      setDragging([])
      setHoveredGroup(undefined)
      const { active, over } = event
      if (!over) {
        return
      }

      const activeId = active.id.toString()
      const overId = over.id.toString()

      const activeGroupId = findGroupId(localGroups, activeId)
      const activeGroup = activeGroupId ? localGroups[activeGroupId] : undefined
      if (!activeGroup) {
        console.error('Could not find source group for dragged item')
      }

      const overGroupId = findGroupId(localGroups, overId)
      const overGroup = overGroupId ? localGroups[overGroupId] : undefined

      if (overGroupId && overGroup && activeGroupId === overGroupId) {
        const overIndex = overGroup.members.indexOf(overId)
        let newIndex
        if (overGroup.id === over.id || overIndex === -1) {
          newIndex = overGroup.members.length
        } else {
          const activeIsBelowOver = !!(
            active.rect.current.translated
            && active.rect.current.translated.top > over.rect.top + over.rect.height
          )
          newIndex = overIndex + +activeIsBelowOver
        }

        const moveAction: MoveMemberAction = {
          type: 'moveMember',
          member: activeId,
          context: createContext({
            array: overGroup.members,
            index: newIndex,
            item: activeId,
          }),
          group: overGroup.id,
        }

        const intermediateGroups = applyGroupActions(localGroups, moveAction)
        const sortAction: SortMembersAction = {
          type: 'sortGroup',
          group: overGroup.id,
          order: sortMemberIds(
            intermediateGroups[overGroupId].members,
            peopleMap,
            groupType,
          ),
        }

        const actions = [moveAction, sortAction]
        sync.syncActions([moveAction, sortAction])
        setLocalGroups(applyGroupActions(localGroups, actions))
      } else if (over.id.toString().startsWith(ADD_GROUP_PREFIX)) {
        // A member was dropped onto an "Add Group" button
        const overTimeId = over.id.toString().slice(ADD_GROUP_PREFIX.length)
        const groupSet = groupSets.find(gs => getTimeId(gs[0].time) === overTimeId)
        if (groupSet) {
          const activePerson = peopleMap.get(active.id.toString())
          const time = groupSet[0].time
          if (canJoinTime({ person: activePerson, time, groupType })) {
            const addedGroup: BibleGroup = {
              ...getNewGroup(groupSet[0].time, groupSet),
              members: [],
            }
            const actions: BGFGroupAction[] = [
              {
                type: 'addGroup',
                group: addedGroup,
              },
              {
                type: 'moveMember',
                member: activeId,
                context: {
                  before: [],
                  after: [],
                },
                group: addedGroup.id,
              },
            ]
            setLocalGroups(lg => applyGroupActions(lg, actions))
            sync.syncActions(actions)
          }
        }
      }
    },
    [getNewGroup, groupSets, groupType, localGroups, peopleMap],
  )

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint }),
    useSensor(TouchSensor, { activationConstraint }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  useEffect(
    () => {
      if (dragging.length) {
        const original = document.body.style.cursor
        document.body.style.cursor = 'grabbing'
        return () => {
          document.body.style.cursor = original
        }
      }
    },
    [dragging],
  )

  useEffect(
    () => {
      requestAnimationFrame(() => {
        recentlyMovedToNewGroup.current = false
      })
    },
    [localGroups],
  )

  const showCampusSpacing = useMemo(
    () => Object.values(localGroups).some(
      g => g.time.campus && g.time.campus !== 'main'
    ),
    [localGroups],
  )

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDrag}
      onDragOver={handleDragOver}
      onDragEnd={handleDrop}
      measuring={measuring}
    >
      <Stack direction="row" sx={noSelectStyle}>
        {groupSets.map(groupSet => (
          <GroupSetSpacer
            draggedFrom={draggedFrom}
            dragging={dragging}
            groupSet={groupSet}
            key={getTimeId(groupSet[0].time)}
          />
        ))}

        <Stack spacing={1} direction="row" pr={2}>
          {groupSets.map((groupSet, i) => (
            <Fragment key={getTimeId(groupSet[0].time)}>
              {i === groupSets.length - 1 && (
                <Divider orientation="vertical" />
              )}

              <GroupSet
                dragging={dragging}
                groupSet={groupSet}
                hoveredGroup={hoveredGroup}
                onAdd={handleAdd}
                onAssign={groupSet[0].id === NOT_IN_A_GROUP_ID ? onAssign : undefined}
                onGenerate={groupSet[0].id === NOT_IN_A_GROUP_ID ? onGenerate : undefined}
                onRemove={handleClickRemove}
                showCampusSpacing={showCampusSpacing}
              />
            </Fragment>
          ))}
        </Stack>

        {groupSets.map(groupSet => (
          <GroupSetSpacer
            after
            draggedFrom={draggedFrom}
            dragging={dragging}
            groupSet={groupSet}
            key={getTimeId(groupSet[0].time)}
          />
        ))}
      </Stack>

      <DragOverlay dropAnimation={null}>
        {dragging.map(person => (
          <PersonDisplay person={person} key={person.responseId} />
        ))}
      </DragOverlay>
    </DndContext>
  )
}

export default GroupsControl
