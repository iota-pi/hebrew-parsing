import { styled, Typography } from '@mui/material'
import { useCallback, useMemo } from 'react'
import { GroupMember, GroupTime } from '../state/people'
import { useAppSelector } from '../store'
import { compareTimes, getTimeId, getTimesKey } from '../util'


const Weak = styled('span')({
  fontWeight: 300,
})

export interface Props {
  person: GroupMember,
}

function AvailableTimesKey({ person }: Props) {
  const renderTimeGroup = useCallback(
    (times: GroupTime[]) => {
      const day = times[0].day.replace(/th/i, 'H').charAt(0).toUpperCase()
      const hoursAndCampuses = times.map(t => {
        const hour = t.start.toString()
        const campus = (
          t.campus && t.campus !== 'main' ? t.campus.charAt(0).toLowerCase() : ''
        )
        return `${hour}${campus}`
      })
      return (
        <span>
          {day}
          <sub>{hoursAndCampuses.join(', ')}</sub>
        </span>
      )
    },
    [],
  )
  const groupType = useAppSelector(state => state.groupType)
  const baseTimes = person[getTimesKey(groupType)]
  const timeGroups = useMemo(
    () => {
      const sorted = baseTimes.filter(t => !!t.day && !!t.start).sort(compareTimes)
      const groups: GroupTime[][] = []
      let currentGroup: GroupTime[] = []
      let currentDay = null
      for (const time of sorted) {
        if (currentDay && currentDay !== time.day) {
          groups.push(currentGroup)
          currentGroup = []
        }
        currentGroup.push(time)
        currentDay = time.day
      }
      if (currentGroup.length) {
        groups.push(currentGroup)
      }
      return groups
    },
    [baseTimes],
  )

  return (
    <Typography variant="caption">
      {timeGroups.map((times, index) => (
        <Weak key={getTimeId(times[0])}>
          {renderTimeGroup(times)}
          {index < timeGroups.length - 1 ? ' · ' : ''}
        </Weak>
      ))}
    </Typography>
  )
}

export default AvailableTimesKey
