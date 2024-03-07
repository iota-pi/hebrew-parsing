import { useMemo } from 'react'
import { useAppSelector } from '../store'
import { compareTimes, getTimeId, getTimesKey } from '../util'
import type { GroupType } from './groupType'
import type { CampusName, GroupMember, GroupTime, MemberEdit } from './people'

export function mergePeopleData({
  applyEdits,
  customPeople,
  edits,
  people,
}: {
  applyEdits: boolean,
  customPeople: GroupMember[],
  edits: Record<string, MemberEdit>,
  people: GroupMember[],
}) {
  const allPeople = [...people, ...customPeople]
  if (applyEdits) {
    return allPeople.map(person => {
      const edit: MemberEdit | undefined = edits[person.ccbId]
      if (edit) {
        return { ...person, ...edit }
      }
      return person
    })
  }
  return allPeople
}

export function usePeople(applyEdits = true) {
  const { people, edits, customPeople } = useAppSelector(state => state.people)
  return useMemo(
    () => mergePeopleData({
      people,
      edits,
      customPeople,
      applyEdits,
    }),
    [applyEdits, customPeople, edits, people],
  )
}

export function filterPeople(people: GroupMember[], faculties: string[], groupType: GroupType) {
  return people.filter(person => {
    if (person.custom) {
      return true
    }
    const times = person[getTimesKey(groupType)].filter(
      t => !t.time.toLowerCase().replace(/\s/g, '').includes('notthisterm'),
    )
    if (times.length === 0) {
      return false
    }
    if (faculties.length === 0 || groupType !== 'Bible Study') {
      // No faculty filtering
      return true
    }
    return faculties.includes(person.faculty)
  })
}

export function useFilteredPeople(groupType: GroupType, applyEdits = true) {
  const people = usePeople(applyEdits)
  const faculties = useAppSelector(state => state.faculties)
  return useMemo(
    () => filterPeople(people, faculties, groupType),
    [faculties, groupType, people],
  )
}

export function usePeopleMap() {
  const people = usePeople()
  return useMemo(
    () => new Map(people.map(person => [person.responseId, person])),
    [people],
  )
}

export function useAllFaculties() {
  const people = usePeople(false)
  return useMemo(
    () => Array.from(new Set(people.map(p => p.faculty))).filter(f => !!f).sort(),
    [people],
  )
}

export function getTimeOptions(
  people: GroupMember[],
  onlyRealTimes: boolean,
  campusFilter: CampusName[],
  groupType: GroupType,
) {
  const results: GroupTime[] = []
  for (const person of people) {
    for (const personTime of person[getTimesKey(groupType)]) {
      const isRealTime = !!personTime.day
      const matchesCampus = campusFilter.includes(personTime.campus)
      const notThisTerm = personTime.time.toLowerCase().replace(/\s/g, '').includes('notthisterm')
      if (
        (isRealTime || !onlyRealTimes)
        && (matchesCampus || !isRealTime)
        && !notThisTerm
      ) {
        const alreadyFound = results.find(
          time => getTimeId(time) === getTimeId(personTime),
        )
        if (!alreadyFound) {
          results.push(personTime)
        }
      }
    }
  }
  return results.sort(compareTimes)
}

export function useGroupTimeOptions(onlyRealTimes = false) {
  const people = usePeople(false)
  const campuses = useAppSelector(state => state.campuses)
  const groupType = useAppSelector(state => state.groupType)
  return useMemo(
    () => getTimeOptions(people, onlyRealTimes, campuses, groupType),
    [campuses, onlyRealTimes, people, groupType],
  )
}

export function useGroupExtraOptions() {
  const people = usePeople(false)
  return useMemo(
    () => {
      const results = people.flatMap(person => person.extraOptions)
      return Array.from(new Set(results)).sort()
    },
    [people],
  )
}
