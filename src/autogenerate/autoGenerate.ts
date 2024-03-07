import { BibleGroups } from '../state/groups'
import type { GroupType } from '../state/groupType'
import type { GroupMember, GroupTime } from '../state/people'
import SyncManager from '../sync/SyncManager'
import { getTimesKey, NOT_IN_A_GROUP_ID, sortMemberIds } from '../util'
import { GeneticSearch, Parent } from './GeneticSearch'
import { getScoreFunc } from './score'
import { ScorerCache } from './ScorerCache'
import { GroupDefinition, toGroups } from './util'

export function autoGenerate(
  {
    groupType,
    initialGroups,
    members,
    peopleMap,
  }: {
    groupType: GroupType,
    initialGroups: BibleGroups,
    members: GroupMember[],
    peopleMap: Map<string, GroupMember>,
  },
): BibleGroups {
  const isPrayerGroup = groupType === 'Prayer Group'
  const scoreFunc = getScoreFunc({ members, initialGroups, peopleMap })
  const cache = new ScorerCache<number>()
  const searcher = new GeneticSearch({
    scoreFunction: cache.withCache(scoreFunc),
    maxIterations: isPrayerGroup ? 500 : 50000,
    timeout: isPrayerGroup ? 50 : 250,
  })
  const availabilities: GroupDefinition[][] = members.map(
    member => member[getTimesKey(groupType)].flatMap(t => (
      isPrayerGroup ? [[t, 0]] : [[t, 0], [t, 1], [t, 2]]
    )),
  )
  let bestResult: Parent<GroupDefinition> = searcher.search(availabilities)
  for (let i = 1; i < 5; ++i) {
    const result = searcher.search(availabilities)
    if (result.score > bestResult.score) {
      bestResult = result
    }
  }
  const groups = toGroups({
    allMembers: members,
    preferences: bestResult.values,
    initialGroups,
    peopleMap,
  })
  return groups
}

export function performAutoGenerate({
  groupType,
  initialGroups,
  peopleToAssign,
  peopleMap,
  allPossibleTimes,
  sync,
}: {
  groupType: GroupType,
  initialGroups: BibleGroups,
  peopleToAssign: GroupMember[],
  peopleMap: Map<string, GroupMember>,
  allPossibleTimes: GroupTime[],
  sync: SyncManager,
}) {
  const timesKey = getTimesKey(groupType)
  const canJoinGroups: GroupMember[] = []
  const notInAGroup: string[] = []
  for (const person of peopleToAssign) {
    if (person[timesKey].filter(t => t.day).length > 0) {
      canJoinGroups.push(person)
    } else if (person.custom) {
      canJoinGroups.push({
        ...person,
        [timesKey]: allPossibleTimes,
      })
    } else {
      notInAGroup.push(person.responseId)
    }
  }
  const { [NOT_IN_A_GROUP_ID]: _, ...filteredInitialGroups } = initialGroups
  const newGroups = autoGenerate({
    members: canJoinGroups,
    initialGroups: filteredInitialGroups,
    groupType,
    peopleMap,
  })
  newGroups[NOT_IN_A_GROUP_ID] = {
    id: NOT_IN_A_GROUP_ID,
    members: notInAGroup,
    time: { campus: 'main', day: '', start: 0, time: 'Not in a group' },
    ccbId: 0,
  }
  const sortedGroups = Object.fromEntries(
    Object.entries(newGroups)
      .filter(([, g]) => g.members.length > 0 || g.id === NOT_IN_A_GROUP_ID)
      .map(([key, group]) => [
        key,
        {
          ...group,
          members: sortMemberIds(group.members, peopleMap, groupType, true),
        },
      ])
  )

  sync.syncActions([{
    type: 'setGroups',
    groups: sortedGroups,
  }])
}

export default autoGenerate
