import Papa from 'papaparse'
import { NOT_IN_A_GROUP_ID } from './constants'
import type { BibleGroup } from './state/groups'
import type { GroupType } from './state/groupType'
import type { CampusName, GroupMember, GroupTime, MissingGroupMember } from './state/people'
import store from './store'

export * from './constants'

type ParsedObject = {
  _: string,
  ccbId: string,
  responseId: string,
  firstName: string,
  lastName: string,
  gender: string,
  year: string,
  faculty: string,
  degree: string,
  times: string,
  prayerTimes: string,
  extraOptions: string,
  comments: string,
}

export function capitalise(value: string) {
  if (value.toLowerCase() !== value && value.toUpperCase() !== value) {
    // Assume name is correctly capitalised
    return value
  }
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase()
}

export function isDefined<T>(value: T | undefined): value is T {
  return value !== undefined
}

export function normaliseColumnName(value: string) {
  const name = value.replace(/\s+/g, '')
  return name.toLowerCase()
}

export function normaliseYear(initial: string) {
  return initial.toLowerCase().replace(/st|nd|rd|th/, '').replace(/\s*and above/, '+').trim()
}

export function normaliseHour(initial: string, fallback?: number): [string, number] {
  const hour = (
    initial
      ? parseFloat(initial.replace(/[^0-9:.]/g, '').replace(':', '.').replace('.30', '.5'))
      : fallback
  )
  if (hour === undefined) {
    throw new Error('normaliseHour given blank string and no fallback')
  }
  const amPm = hour < 9 ? 'pm' : 'am'
  const hourString = `${hour.toString().replace('.5', ':30')}${amPm}`
  return [hourString, hour]
}

export function normaliseTimes(initial: string): GroupTime[] {
  const times = initial.split(/,(?=\S)/g)
  return times.filter(t => t).map(time => {
    let campus: CampusName = 'main'
    const onlineRegex = /online:?/gi
    const artAndDesignRegex = /(art (&|and) design( campus)?\s*-?\s*)|(?:paddington)/gi
    if (onlineRegex.test(time)) {
      campus = 'online'
    }
    if (artAndDesignRegex.test(time)) {
      campus = 'art & design'
    }

    // Handle time options which have no actual time
    const digitRegex = /\d/
    if (!digitRegex.test(time)) {
      return { campus, day: '', start: 0, time }
    }

    const bracketsRegex = /\([^)]*\)/g
    const dayAndTime = (
      time
        .replace(onlineRegex, '')
        .replace(artAndDesignRegex, '')
        .replace(bracketsRegex, '')
        .replace(/in[- ]person:?/gi, '')
        .trim()
    )
    const day = dayAndTime.replace(/\s.*$/, '').slice(0, 3)
    const [rawStart, rawEnd] = dayAndTime.replace(/^\D*/, '').split(/\s*-\s*/, 2)

    const [start, startHour] = normaliseHour(rawStart)
    const [end] = normaliseHour(rawEnd, startHour)

    return {
      campus,
      day,
      start: startHour,
      time: `${day} ${start}-${end}`,
    }
  })
}

export function normaliseOptions(initial?: string) {
  const options = (initial || '').split(/,(?=\S)/g)
  return options.filter(o => o)
}

export async function parseData(data: string): Promise<GroupMember[]> {
  const parsedData = Papa.parse(
    data,
    {
      header: true,
      transformHeader: header => {
        const expectedHeaders: (keyof ParsedObject)[] = [
          'ccbId',
          'responseId',
          'firstName',
          'lastName',
          'gender',
          'year',
          'faculty',
          'degree',
          'times',
          'prayerTimes',
          'extraOptions',
          'comments',
        ]
        if ((expectedHeaders as string[]).includes(header)) {
          return header
        }

        const normalised = normaliseColumnName(header)
        if (normalised.includes('individualid')) return 'ccbId'
        if (normalised.includes('responseid')) return 'responseId'
        if (normalised.includes('firstname')) return 'firstName'
        if (normalised.includes('lastname')) return 'lastName'
        if (normalised.includes('gender')) return 'gender'
        if (normalised.includes('year')) return 'year'
        if (normalised.includes('faculty')) return 'faculty'
        if (normalised.includes('degree')) return 'degree'
        if (
          normalised.includes('time')
          && (normalised.includes('biblestudy') || normalised.includes('growthgroup'))
        ) {
          return 'times'
        }
        if (normalised.includes('time') && normalised.includes('prayer')) {
          return 'prayerTimes'
        }
        if (normalised.includes('options')) return 'extraOptions'
        if (normalised.includes('information')) return 'comments'
        return '_'
      },
      skipEmptyLines: true,
    } as Papa.ParseConfig<ParsedObject, undefined>,
  )
  const result: GroupMember[] = parsedData.data.map(row => {
    const { _, ...rowData } = row
    const extraOptions = normaliseOptions(rowData.extraOptions)
    return ({
      ...rowData,
      firstName: capitalise(rowData.firstName.trim()),
      lastName: capitalise(rowData.lastName.trim()),
      gender: rowData.gender as 'm' | 'f',
      year: normaliseYear(rowData.year),
      times: normaliseTimes(rowData.times),
      prayerTimes: normaliseTimes(rowData.prayerTimes),
      extraOptions,
      leader: extraOptions.filter(option => option.includes('leader')).length > 0,
      prayerLeader: false,
      previous: [],
    })
  })
  return result
}

export function deduplicate(people: GroupMember[]) {
  // Keep last form entry
  const mapById = new Map<string, GroupMember>()
  for (const person of people) {
    if (person.ccbId) {
      const previous = mapById.get(person.ccbId)
      mapById.set(
        person.ccbId,
        !previous ? person : {
          ...person,
          previous: [...previous.previous, previous],
        },
      )
    }
  }
  return Array.from(mapById.values())
}

export function countUnmatched(people: GroupMember[]) {
  return people.filter(person => !person.ccbId).length
}

export function getCampusId(campus: CampusName) {
  return campus.charAt(0)
}

export function getTimeId(time: GroupTime) {
  const day = (
    time.time.charAt(1) === 'h'
      ? 'H'
      : time.time.charAt(0)
  )
  const timeString = time.time.slice(4, 6).replace('a', '').replace('p', '')
  return day + timeString + getCampusId(time.campus)
}

export function getGroupId(time: GroupTime, index: number): string {
  return getTimeId(time) + index
}

export function getBlankGroup(id: string, time: GroupTime): BibleGroup {
  return {
    id,
    members: [],
    time,
    ccbId: 0,
  }
}

export function compareTimes(a: GroupTime, b: GroupTime): number {
  const dayArray = ['mon', 'tue', 'wed', 'thu', 'fri']
  let dayIndexA = dayArray.indexOf(a.day.toLowerCase())
  let dayIndexB = dayArray.indexOf(b.day.toLowerCase())
  if (dayIndexA === -1) { dayIndexA = 999 }
  if (dayIndexB === -1) { dayIndexB = 999 }
  const compareDays = dayIndexA - dayIndexB
  if (compareDays) { return compareDays }

  const startA = a.start < 9 ? a.start + 12 : a.start
  const startB = b.start < 9 ? b.start + 12 : b.start
  const compareStart = startA - startB
  if (compareStart) { return compareStart }

  const campusArray: CampusName[] = ['main', 'art & design', 'online']
  let campusIndexA = campusArray.indexOf(a.campus)
  let campusIndexB = campusArray.indexOf(b.campus)
  if (campusIndexA === -1) { campusIndexA = 999 }
  if (campusIndexB === -1) { campusIndexB = 999 }
  const compareCampus = campusIndexA - campusIndexB
  if (compareCampus) { return compareCampus }

  return 0
}

export function prettyCampusName(campus: CampusName): string {
  const nameMap: Record<CampusName, string> = {
    'art & design': 'Art & Design',
    main: 'Main',
    online: 'Online',
  }
  return nameMap[campus]
}

export function compareGroupsByTime(a: BibleGroup, b: BibleGroup) {
  return compareTimes(a.time, b.time)
}

export function compareGroupSetsByTime(a: BibleGroup[], b: BibleGroup[]) {
  return compareGroupsByTime(a[0], b[0])
}

export function getCompareMembers(groupType: GroupType, sortGender = false) {
  const leaderKey = getLeaderKey(groupType)
  return function compareMembers(a?: GroupMember, b?: GroupMember) {
    if (!b) return 1
    if (!a) return -1
    const leaderOrder = +b[leaderKey] - +a[leaderKey]
    if (leaderOrder) return leaderOrder
    if (sortGender) {
      const genderOrder = +(b.gender === 'm') - +(a.gender === 'm')
      if (genderOrder) return genderOrder
    }
    return 0
  }
}

export function getTimesKey(
  groupType?: GroupType,
): Extract<keyof GroupMember, 'times' | 'prayerTimes'> {
  return groupType === 'Prayer Group' ? 'prayerTimes' : 'times'
}

export function getLeaderKey(
  groupType?: GroupType,
): Extract<keyof GroupMember, 'leader' | 'prayerLeader'> {
  return groupType === 'Prayer Group' ? 'prayerLeader' : 'leader'
}

export function canJoinGroup(
  { group, person, groupType }: { group: BibleGroup, person?: GroupMember, groupType: GroupType },
) {
  if (!person) {
    return false
  }
  if (group.id === NOT_IN_A_GROUP_ID) {
    return true
  }
  return canJoinTime({ person, time: group.time, groupType })
}

export function canJoinTime(
  {
    person,
    time,
    groupType,
  }: {
    person?: GroupMember | MissingGroupMember,
    time: GroupTime,
    groupType: GroupType,
  },
) {
  if (!person) {
    return false
  }
  if (person.missing) {
    return false
  }
  if (person.custom) {
    return true
  }
  const groupTimeId = getTimeId(time)
  const timesKey = getTimesKey(groupType)
  return person[timesKey].findIndex(t => getTimeId(t) === groupTimeId) > -1
}

export function getCCBGroupName({ faculty, time, members, term, groupType }: {
  faculty: string,
  groupType: GroupType,
  members: GroupMember[],
  time: GroupTime,
  term: string,
}): string {
  const year = new Date().getFullYear()
  const { day, start } = time

  if (groupType === 'Prayer Group') {
    return `${year} ${term} Prayer Group (${day} ${start})`
  }

  const men = members.filter(m => m.gender === 'm').length
  const women = members.filter(m => m.gender === 'f').length
  const primary = men > women ? 'M' : 'F'
  const isMixed = men > 0 && women > 0
  const gender = isMixed ? 'X' : primary

  const leaders = members.filter(m => m[getLeaderKey(groupType)])
  const leaderNames = leaders.map(l => `${l.firstName} ${l.lastName.charAt(0)}`).join(', ')
  const leaderFirstNames = leaders.map(l => l.firstName).join(', ')

  const base = `${year} ${term} ${faculty} ${day} ${start} ${gender}`
  const optimal = `${base} (${leaderNames})`
  if (optimal.length < 50) {
    return optimal
  }
  const nextBest = `${base} (${leaderFirstNames})`
  if (nextBest.length < 50) {
    return nextBest
  }
  return `${base} (${leaderFirstNames.slice(0, 47 - base.length)})`
}

export function prettyTimeString(timeString: string) {
  return timeString.replace('-', '–')
}

export function getGenderBalance(members: GroupMember[]) {
  const cachedIsLeader = getIsLeader()
  let men = 0
  let women = 0
  let maleLeaders = 0
  let femaleLeaders = 0
  for (let i = 0; i < members.length; ++i) {
    const member = members[i]
    const leader = cachedIsLeader(member)
    if (member.gender === 'm') {
      men += 1
      if (leader) {
        maleLeaders += 1
      }
    } else if (member.gender === 'f') {
      women += 1
      if (leader) {
        femaleLeaders += 1
      }
    }
  }
  return { men, women, maleLeaders, femaleLeaders }
}

export function sortMemberIds(
  memberIds: string[],
  peopleMap: Map<string, GroupMember>,
  groupType: GroupType,
  sortGender = false,
) {
  const members = (
    memberIds
      .map(m => peopleMap.get(m))
      .filter(isDefined)
  )
  members.sort(getCompareMembers(groupType, sortGender))
  const sortedMembers = members.map(m => m.responseId)
  return [...sortedMembers]
}

export function getIsLeader() {
  const state = store.getState()
  const key = state.groupType === 'Prayer Group' ? 'prayerLeader' : 'leader'
  return (person?: GroupMember | MissingGroupMember) => {
    if (!person) {
      return false
    }
    return person[key] || false
  }
}

export function isLeader(person?: GroupMember | MissingGroupMember): boolean {
  return getIsLeader()(person)
}

export function formatCarpls(carpls: string) {
  return carpls.replace(/[\d\s]/g, '').charAt(0).toUpperCase()
}

export function getRandomId() {
  return Math.random().toString(36).slice(2)
}
