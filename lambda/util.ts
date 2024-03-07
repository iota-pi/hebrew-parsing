import { randomBytes } from 'crypto'
import { TERM_START_DATE } from '../src/constants'
import {
  ATTENDANCE_GROUP_MAP,
  CCB_CAMPUS_IDS,
  CCB_DEPARTMENT_IDS,
  CCB_GROUP_TYPES,
} from './constants'

export const ONE_SECOND = 1000
export const ONE_MINUTE = 60 * ONE_SECOND
export const ONE_HOUR = 60 * ONE_MINUTE
export const ONE_DAY = 24 * ONE_HOUR
export const ONE_MONTH = 30 * ONE_DAY
export const LOGIN_EXPIRY = ONE_DAY

export function getSessionId(complexity = 3) {
  return randomBytes(complexity).toString('base64url')
}

export function getAttendanceGroup(faculty: string): number {
  return ATTENDANCE_GROUP_MAP[faculty.toLowerCase()]
}

export function getReverseMap<S, T>(data: [S, T][]): Map<T, S> {
  return new Map(data.map(([a, b]) => [b, a]))
}

export function checkTermStart() {
  if (TERM_START_DATE.getTime() < Date.now() - ONE_DAY * 7) {
    throw new Error('TERM_START_DATE is too old, did you forget to update it?')
  }

  if (TERM_START_DATE.getDay() !== 1) {
    throw new Error('TERM_START_DATE is not a Monday')
  }
}

export function getCampusId(campus: string) {
  const campusId = CCB_CAMPUS_IDS.get(campus.toLowerCase())
  if (!campusId) {
    throw new Error(`Could not find CCB ID for campus: ${campus}`)
  }
  return campusId
}

export function getDepartmentId(department: string) {
  const departmentId = CCB_DEPARTMENT_IDS.get(department.toLowerCase())
  if (!departmentId) {
    throw new Error(`Could not find CCB ID for department: ${department}`)
  }
  return departmentId
}

export function getGroupTypeId(groupType: string) {
  const groupTypeId = CCB_GROUP_TYPES.get(groupType.toLowerCase())
  if (!groupTypeId) {
    throw new Error(`Could not find CCB ID for group type: ${groupType}`)
  }
  return groupTypeId
}
