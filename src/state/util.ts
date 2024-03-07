import type { ObjectDelta } from 'jsondiffpatch'
import hashObject from 'object-hash'
import type { Projection, StateHashes, StateProjection, SyncState } from '../../lambda/types'
import { NOT_IN_A_GROUP_ID } from '../constants'
import type { CampusName, GroupMember } from './people'

export const NEW_SESSION_STATE: SyncState = {
  campuses: ['main'],
  ccbIds: [],
  customPeople: [],
  edits: {},
  faculties: [],
  groups: {
    [NOT_IN_A_GROUP_ID]: {
      id: NOT_IN_A_GROUP_ID,
      members: [],
      time: { campus: 'main', day: '', start: 0, time: 'Not in a group' },
      ccbId: 0,
    },
  },
  groupType: 'Bible Study',
}

export const ensureUniqueCustomPeople = (people: GroupMember[]) => {
  const result: GroupMember[] = []
  const seenPeople = new Set<string>()
  for (const person of people) {
    if (!seenPeople.has(person.responseId)) {
      seenPeople.add(person.responseId)
      result.push(person)
    }
  }
  if (result.length === people.length) {
    return people
  }
  return result
}

export const ensureUniqueCampuses = (campuses: CampusName[]) => {
  const result: CampusName[] = []
  const found = new Set<CampusName>()
  for (const faculty of campuses) {
    if (!found.has(faculty)) {
      result.push(faculty)
      found.add(faculty)
    }
  }
  if (result.length === campuses.length) {
    return campuses
  }
  return result
}

export const ensureUniqueFaculties = (faculties: string[]) => {
  const result: string[] = []
  const found = new Set<string>()
  for (const faculty of faculties) {
    if (!found.has(faculty)) {
      result.push(faculty)
      found.add(faculty)
    }
  }
  if (result.length === faculties.length) {
    return faculties
  }
  return result
}

export function applyProjection<T extends object>(
  object: T,
  projection?: Projection<{ [K in keyof T]: unknown }>,
): Partial<T> {
  if (!projection) {
    return object
  }
  return Object.fromEntries(
    Object.entries(object)
      .map(([key, value]) => {
        const projectionValue = projection[key as keyof T]
        return (
          typeof projectionValue === 'object'
            ? [key, applyProjection(
              object[key as keyof T] as object,
              projectionValue,
            )]
            : [key, projectionValue ? value : undefined]
        )
      })
      .filter(([, value]) => value !== undefined),
  ) satisfies Partial<typeof object>
}

export function getProjectionFromDiff(diff: ObjectDelta | undefined): StateProjection {
  if (!diff) {
    return {}
  }
  return Object.fromEntries(
    Object.entries(diff).map(([key]) => [
      key,
      (
        key === 'groups'
          ? getProjectionFromDiff(diff[key] as ObjectDelta)
          : true
      ),
    ]),
  )
}

export function getHashes<T extends Record<string, object | string>>(
  object: T,
): Record<keyof T, string> {
  return Object.fromEntries(
    Object.keys(object).map((key: keyof T) => [
      key,
      shortHash(object[key])
    ])
  ) as Record<keyof T, string>
}

export function getStateHashes(state: SyncState): StateHashes {
  return {
    ...getHashes(state),
    groups: getHashes(state.groups),
  }
}

export function shortHash(object: object | string): string {
  return hashObject(object, { encoding: 'base64' }).slice(0, 16)
}
