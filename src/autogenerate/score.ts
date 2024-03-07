import type { BibleGroups } from '../state/groups'
import type { GroupMember } from '../state/people'
import { getGenderBalance, getIsLeader } from '../util'
import { GroupDefinition, addToGroupMap, groupsToGroupMap } from './util'

// Other possible scoring ideas:
// - score based on CARPLS data
// - score based on if everyone except leaders is in first-year (i.e. a FY group)

export interface TimetableScore {
  score: number,
  groups: BibleGroups,
}

export function getScoreFunc(
  {
    members,
    initialGroups,
    peopleMap,
  }: {
    members: GroupMember[],
    initialGroups: BibleGroups,
    peopleMap: Map<string, GroupMember>,
  },
) {
  const initialGroupMap = groupsToGroupMap({ groups: initialGroups, peopleMap })
  return (preferences: GroupDefinition[]) => {
    let score = 0
    const groupsMap = addToGroupMap({ people: members, preferences, initialGroupMap })
    const groups = Object.values(groupsMap)

    for (let i = 0; i < groups.length; ++i) {
      const groupMembers = groups[i]
      score += scoreGenderRatios(groupMembers)
      score += scoreGroupSize(groupMembers)
      score += scoreLeaderCount(groupMembers)
      score += scoreLeaderGender(groupMembers)
    }

    // Slightly prefer groups with lower index numbers
    score += preferences.reduce((acc, [, groupNumber]) => acc - groupNumber, 0)

    return score
  }
}

function scoreGenderRatios(members: GroupMember[]) {
  const { men, women } = getGenderBalance(members)
  if (men === 0 || women === 0) {
    return 1
  }
  if (men === 1 || women === 1) {
    return -5
  }
  const total = men + women
  if (men / total < 0.3 || women / total < 0.3) {
    return -1
  }
  return 1
}

function scoreGroupSize(members: GroupMember[]) {
  if (members.length <= 2) {
    return -5
  }
  if (members.length <= 4) {
    return -3
  }
  if (members.length <= 5) {
    return -1
  }
  if (members.length <= 8) {
    return 3
  }
  if (members.length <= 10) {
    return -1
  }
  return -5
}

function scoreLeaderCount(members: GroupMember[]) {
  let leaderCount = 0
  const isLeader = getIsLeader()
  for (let i = 0; i < members.length; ++i) {
    if (isLeader(members[i])) {
      leaderCount += 1
    }
  }
  if (leaderCount === 0) {
    return 0
  }
  if (leaderCount < 3) {
    return 2
  }
  if (leaderCount === 3) {
    return 1
  }
  return -1
}

function scoreLeaderGender(members: GroupMember[]) {
  const { men, women, maleLeaders, femaleLeaders } = getGenderBalance(members)
  if (men === 0 || women === 0) {
    return 0
  }
  if ((men > 0 && maleLeaders === 0) || (women > 0 && femaleLeaders === 0)) {
    return -5
  }
  return 0
}
