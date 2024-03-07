import { BibleGroups } from '../state/groups'
import type { GroupMember, GroupTime } from '../state/people'
import { getBlankGroup, getGroupId, isDefined } from '../util'

export type GroupDefinition = [GroupTime, number]

export function addToGroupMap(
  {
    initialGroupMap,
    people: members,
    preferences,
  }: {
    initialGroupMap: Record<string, GroupMember[]>,
    people: GroupMember[],
    preferences: GroupDefinition[],
  },
): Record<string, GroupMember[]> {
  const groupsMap: Record<string, GroupMember[]> = { ...initialGroupMap }
  const count = members.length
  for (let i = 0; i < count; ++i) {
    const key = getGroupId(preferences[i][0], preferences[i][1])
    if (groupsMap[key]) {
      groupsMap[key].push(members[i])
    } else {
      groupsMap[key] = [members[i]]
    }
  }
  return groupsMap
}

export function groupsToGroupMap(
  {
    groups,
    peopleMap,
  }: {
    groups: BibleGroups,
    peopleMap: Map<string, GroupMember>,
  },
): Record<string, GroupMember[]> {
  const groupsMap: Record<string, GroupMember[]> = Object.fromEntries(
    Object.entries(groups).map(
      ([id, group]) => [id, group.members.map(m => peopleMap.get(m)).filter(isDefined)]
    ),
  )
  return groupsMap
}

export function toGroups(
  {
    allMembers,
    preferences,
    initialGroups,
    peopleMap,
  }: {
    allMembers: GroupMember[],
    preferences: GroupDefinition[],
    initialGroups: BibleGroups,
    peopleMap: Map<string, GroupMember>,
  },
) {
  const initialGroupMap = groupsToGroupMap({ groups: initialGroups, peopleMap })
  const timeMap = Object.fromEntries(preferences.map(p => [getGroupId(p[0], p[1]), p[0]]))
  const groupsMap = addToGroupMap({ people: allMembers, preferences, initialGroupMap })
  const groups: BibleGroups = {}
  const groupIds = Object.keys(groupsMap)
  for (const groupId of groupIds) {
    const members = groupsMap[groupId].map(m => m.responseId)
    if (Object.hasOwn(initialGroups, groupId)) {
      const initialGroup = initialGroups[groupId]
      groups[groupId] = {
        ...initialGroup,
        members,
      }
    } else {
      const time = timeMap[groupId]
      groups[groupId] = {
        ...getBlankGroup(groupId, time),
        members,
      }
    }
  }
  return groups
}
