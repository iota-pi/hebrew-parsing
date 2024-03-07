import { useDroppable } from '@dnd-kit/core'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Box, BoxProps, IconButton, SxProps, Tooltip, Typography } from '@mui/material'
import { blue, grey, pink } from '@mui/material/colors'
import { memo, MouseEvent, TouchEvent, useCallback, useMemo } from 'react'
import { setEditPerson } from '../state/editPerson'
import type { Gender, GroupMember, MissingGroupMember } from '../state/people'
import { useAppDispatch, useAppSelector } from '../store'
import { CommentIcon, EditIcon } from './Icons'
import AvailableTimesKey from './AvailableTimesKey'
import { canJoinTime, formatCarpls, isLeader } from '../util'


export interface PlaceholderProps {
  emptyLabel?: string,
  groupId: string,
}

export interface PersonDisplayProps {
  person: GroupMember,
}

export interface DraggablePersonProps {
  person: GroupMember | MissingGroupMember,
}

const bgMap: Record<Gender, string> = {
  m: blue[100],
  f: pink[100],
  '': grey[100],
}

const BasePerson = (
  {
    hasHighlight,
    gender,
    faded,
    ...props
  }: BoxProps & { hasHighlight?: boolean, gender?: Gender, faded?: boolean },
) => {
  const backgroundColor = (gender !== undefined && bgMap[gender]) || grey[100]
  const opacity = faded ? 0.5 : undefined

  return (
    <Box
      alignItems="center"
      display="flex"
      justifyContent="space-between"
      minWidth={180}
      minHeight={45}
      px={1}
      pr={0.5}
      py={0.5}
      borderLeft={hasHighlight ? '2px solid red' : undefined}
      sx={{ backgroundColor, opacity }}
      {...props}
    >
      {props.children}
    </Box>
  )
}

export const PlaceholderPerson = (
  { emptyLabel, groupId }: PlaceholderProps,
) => {
  const {
    setNodeRef,
  } = useDroppable({
    id: groupId,
  })

  return (
    <div ref={setNodeRef}>
      <BasePerson>
        <Box>
          <Typography
            fontSize="0.95rem"
            lineHeight={1}
          >
            (no {emptyLabel || 'people'})
          </Typography>
        </Box>
      </BasePerson>
    </div>
  )
}

const iconSx: SxProps = {
  mb: -0.5,
  ml: 0.25,
  opacity: 0.8,
}

export const PersonDisplay = memo(({ person }: PersonDisplayProps) => {
  const dispatch = useAppDispatch()
  const handlePointerDown = useCallback(
    (event: MouseEvent | TouchEvent) => event.stopPropagation(),
    [],
  )
  const handleEdit = useCallback(
    () => {
      dispatch(setEditPerson(person.responseId || null))
    },
    [dispatch, person.responseId],
  )

  const edits = useAppSelector(state => state.people.edits)
  const hasEdit = useMemo(
    () => !!person && Object.hasOwn(edits, person.responseId),
    [edits, person],
  )

  const groupType = useAppSelector(state => state.groupType)

  const highlightTime = useAppSelector(state => state.ui.highlightTime)
  const notHighlighted = (
    highlightTime
      ? !canJoinTime({ person, time: highlightTime, groupType })
      : false
  )

  const allCarpls = useAppSelector(state => state.people.carpls)
  const carpls = allCarpls[person.ccbId] || null

  return (
    <BasePerson
      hasHighlight={false}
      gender={person.gender}
      faded={notHighlighted}
    >
      <Box>
        <Typography
          color="text.secondary"
          fontSize="0.95rem"
          fontWeight={isLeader(person) ? 700 : undefined}
          lineHeight={0.8}
          component="span"
        >
          {person.firstName} {person.lastName}
        </Typography>

        {person.comments && (
          <Tooltip title={person.comments}>
            <CommentIcon fontSize="inherit" sx={iconSx} />
          </Tooltip>
        )}

        <Box mt={-0.75} mb={-0.25}>
          {carpls && (
            <>
              <Typography
                variant="caption"
                fontWeight={Number.parseInt(carpls.charAt(0)) >= 4 ? 700 : 500}
              >
                {formatCarpls(carpls)}
              </Typography>
              <Typography variant="caption">
                {' · '}
              </Typography>
            </>
          )}
          <AvailableTimesKey person={person} />
        </Box>
      </Box>

      <Box
        alignItems="center"
        display="flex"
      >
        {!person.custom && (
          <IconButton
            onClick={handleEdit}
            onMouseDown={handlePointerDown}
            onTouchStart={handlePointerDown}
            size="small"
            sx={{
              color: hasEdit ? 'text.primary' : undefined,
              opacity: hasEdit ? undefined : 0.9,
            }}
          >
            <EditIcon fontSize="small" />
          </IconButton>
        )}
      </Box>
    </BasePerson>
  )
})
PersonDisplay.displayName = 'PersonDisplay'

const MissingPerson = memo(({ responseId }: { responseId: string }) => (
  <BasePerson>
    <Typography
      color="text.secondary"
      fontSize="0.95rem"
      mt={0.5}
      lineHeight={1}
    >
      {`Unknown (id: ${responseId})`}
    </Typography>
  </BasePerson>
))
MissingPerson.displayName = 'MissingPerson'

export const DraggablePerson = ({ person }: DraggablePersonProps) => {
  const {
    attributes,
    isDragging,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({
    id: person.responseId,
  })

  const style = useMemo(
    () => ({
      cursor: 'grab',
      opacity: isDragging ? 0.7 : undefined,
      transform: CSS.Transform.toString(transform),
      transition,
    }),
    [isDragging, transform, transition],
  )

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
    >
      {person.missing ? (
        <MissingPerson responseId={person.responseId} />
      ) : (
        <PersonDisplay person={person} />
      )}
    </div>
  )
}

export default DraggablePerson
