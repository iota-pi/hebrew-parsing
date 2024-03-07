import { IconButton, styled, Typography, TypographyProps } from '@mui/material'
import { blue, pink } from '@mui/material/colors'
import { memo, useCallback, useMemo } from 'react'
import { BibleGroup } from '../state/groups'
import { usePeopleMap } from '../state/selectors'
import { isDefined, TARGET_GROUP_SIZE } from '../util'
import { CloseIcon } from './Icons'

const Container = styled('div')({
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
})

const Text = ({ children, ...props }: TypographyProps) => (
  <Typography
    variant="caption"
    {...props}
  >
    {children}
  </Typography>
)

export interface Props {
  group: BibleGroup,
  onRemove?: (groupId: string) => void,
}

const GroupHeader = memo(({ group, onRemove }: Props) => {
  const peopleMap = usePeopleMap()
  const groupMembers = useMemo(
    () => group.members.map(id => peopleMap.get(id)).filter(isDefined),
    [group.members, peopleMap],
  )
  const men = useMemo(
    () => groupMembers.filter(m => m.gender === 'm').length,
    [groupMembers],
  )
  const women = useMemo(
    () => groupMembers.filter(m => m.gender === 'f').length,
    [groupMembers],
  )
  const total = groupMembers.length

  const handleRemove = useCallback(() => onRemove?.(group.id), [group.id, onRemove])

  return (
    <Container>
      <div>
        <Text>
          Group size:
          {' '}
        </Text>

        <Text
          fontWeight={total > TARGET_GROUP_SIZE ? 700 : undefined}
        >
          {total}
          {' '}
        </Text>

        {total > 0 && (
          <>
            <Text>(</Text>
            <Text
              fontWeight={men > 0 ? 500 : undefined}
              sx={{ color: men > 0 ? blue[600] : undefined }}
            >
              {men}
            </Text>
            <Text>
              {' : '}
            </Text>
            <Text
              fontWeight={women > 0 ? 500 : undefined}
              sx={{ color: women > 0 ? pink[500] : undefined }}
            >
              {women}
            </Text>
            <Text>)</Text>
          </>
        )}
      </div>

      {onRemove && (
        <IconButton onClick={handleRemove} size="small">
          <CloseIcon fontSize="small" />
        </IconButton>
      )}
    </Container>
  )
})
GroupHeader.displayName = 'GroupHeader'

export default GroupHeader
