import axiosBase from 'axios'
import { XMLParser } from 'fast-xml-parser'
import { BIBLE_STUDY_DURATION, ONE_DAY, ONE_HOUR, ONE_WEEK, TERM_START_DATE, WEEKS_IN_TERM } from '../src/constants'
import CCBDataCache from './CCBDataCache'
import { CreateGroupData } from './types'
import { getAttendanceGroup, getDepartmentId } from './util'

/* eslint-disable @typescript-eslint/no-explicit-any */

const baseURL = 'https://campusbiblestudy.ccbchurch.com/api.php?srv='
const auth = {
  username: process.env.CCB_USERNAME!,
  password: process.env.CCB_PASSWORD!,
}
const axios = axiosBase.create({ auth })

export interface GroupForAPI {
  name: string,
  campus: number,
  day: string,
  departmentId: number,
  faculty: string,
  groupType: number,
  leaders: number[],
  members: number[],
  time: string,
}

export type CacheKeyType = 'groups' | 'events'

export async function loadGeneralData(forceUpdate: CacheKeyType[] = []) {
  const cache = new CCBDataCache<CacheKeyType, [number, string][]>()
  await cache.setDefault('groups', getRecentGroups, forceUpdate.includes('groups'))
  return cache
}

function raiseErrorFromAPI(data: any) {
  const error = data.errors?.error
  if (error) {
    if (typeof error === 'string') {
      throw new Error(error)
    }
    if (Array.isArray(error)) {
      throw new Error((error as string[]).join('; '))
    }
    if (error['#text']) {
      throw new Error(error['#text'])
    }
    console.warn('Unexpected error format: ', JSON.stringify(error))
    throw new Error(error)
  }
}

function parseXMLResponse(data: string) {
  const parser = new XMLParser({
    ignoreAttributes: false,
  })
  const fullTree = parser.parse(data).ccb_api
  if (!fullTree.response) {
    if (fullTree.groups || fullTree.errors || fullTree.error) {
      // The CCB API is ridiculously inconsistent...
      // Usually it wraps it's responses in a <response> element but sometimes it doesn't
      // If not, just return the full ccb_api tree so the calling function doesn't have to worry
      return fullTree
    }

    throw new Error(`Could not find <response> element in XML: ${data}`)
  }
  return fullTree.response
}

function formatDate(date: Date) {
  let month = (date.getUTCMonth() + 1).toString()
  let day = date.getUTCDate().toString()
  const year = date.getUTCFullYear()

  if (month.length < 2) month = `0${month}`
  if (day.length < 2) day = `0${day}`

  return [year, month, day].join('-')
}

function formatDateAndTime(date: Date) {
  const hh = date.getUTCHours().toString().padStart(2, '0')
  const mm = date.getUTCMinutes().toString().padStart(2, '0')
  const ss = date.getUTCSeconds().toString().padStart(2, '0')
  return `${formatDate(date)}+${hh}:${mm}:${ss}`
}

export function getURI(service: string, data?: object) {
  const dataString = getURIEncodedData(data)
  const joiner = dataString ? '&' : ''
  const uri = `${baseURL}${service}${joiner}${dataString}`
  return uri
}

export function getURIEncodedData(data?: object) {
  const entries = Object.entries(data || {})
  return entries.filter(([, value]) => value !== undefined).flatMap(
    ([key, value]) => {
      if (key.endsWith('[]') && Array.isArray(value)) {
        return value.map(v => `${encodeURIComponent(key)}=${encodeURIComponent(v)}`)
      }
      return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`
    },
  ).join('&')
}

export async function createGroup({
  campus,
  departmentId,
  groupType,
  interactionType,
  mainLeader,
  name,
}: {
  campus: number,
  departmentId: number,
  mainLeader: number,
  groupType: number,
  interactionType: string,
  name: string,
}) {
  const uri = getURI('create_group', {
    campus_id: campus,
    name,
    main_leader_id: mainLeader,
    group_type_id: groupType,
    department_id: departmentId,
    interaction_type: interactionType,
  })
  const result = await axios.post(uri)

  const response = parseXMLResponse(result.data)
  const group = response.groups?.group
  if (!group) {
    raiseErrorFromAPI(response)
    console.error(result.data)
    throw new Error('Could not find group details in response')
  }
  const id = parseInt(group['@_id'])
  if (!id) {
    throw new Error(`Could not parse group id: ${JSON.stringify(group)}`)
  }
  console.info('Created group with id', id)
  return id
}

export async function updateGroup({
  group,
  groupId,
  mainLeader,
}: {
  group: CreateGroupData,
  groupId: number,
  mainLeader: number,
}) {
  const uri = getURI('update_group', {
    id: groupId,
  })
  const data = getURIEncodedData({
    name: group.name,
    main_leader_id: mainLeader,
    inactive: false,
  })
  const result = await axios.post(uri, data)
  const response = parseXMLResponse(result.data)
  const newGroup = response.groups?.group
  if (!newGroup) {
    raiseErrorFromAPI(response)
    console.error(result.data)
    throw new Error('Could not find group details in response')
  }
}

export async function inactivateGroup({
  groupId,
}: {
  groupId: number,
}) {
  const uri = getURI('update_group', {
    id: groupId,
  })
  const data = getURIEncodedData({
    inactive: true,
  })
  const result = await axios.post(uri, data)
  const response = parseXMLResponse(result.data)
  const newGroup = response.groups?.group
  if (!newGroup) {
    raiseErrorFromAPI(response)
    console.error(result.data)
    throw new Error('Could not find group details in response')
  }
}

export async function getGroupMembers(group: number) {
  const uri = getURI('group_participants', {
    id: group,
    include_inactive: false,
  })
  const result = await axios.post(uri)
  const response = parseXMLResponse(result.data)
  let participants = response.groups?.group?.participants?.participant as any[] | undefined
  if (!participants) {
    raiseErrorFromAPI(response)
    console.error(result.data)
    throw new Error('Could not find event details in response')
  }
  if (!Array.isArray(participants)) {
    participants = [participants]
  }
  return participants.map(getIdAndName)
}

export async function removeOldGroupMembers({
  callback,
  group,
  members,
}: {
  callback?: (name: string) => Promise<any>,
  group: number,
  members: number[],
}) {
  const existingMembers = await getGroupMembers(group)
  const toRemove = existingMembers.filter(([id]) => !members.includes(id as number))
  for (const [member, name] of toRemove) {
    // eslint-disable-next-line no-await-in-loop
    await removeMember({ group, member })
    // eslint-disable-next-line no-await-in-loop
    await callback?.(name)
  }
}

export async function addGroupMembers({
  callback,
  group,
  members,
}: {
  callback?: () => Promise<any>,
  group: number,
  members: number[],
}) {
  for (const member of members) {
    const uri = getURI('add_individual_to_group', {
      id: member,
      group_id: group,
      status: 'add',
    })
    // eslint-disable-next-line no-await-in-loop
    await axios.post(uri)
    // eslint-disable-next-line no-await-in-loop
    await callback?.()
  }
}

export async function setGroupLeaders({
  group,
  leaders,
}: {
  group: number,
  leaders: number[],
}) {
  const uri = getURI('manage_group_leaders', {
    group_id: group,
    'leader_ids[]': leaders,
  })
  await axios.post(uri)
}

export async function createEvent({
  name,
  groupId,
  startDate,
  day,
  department,
  duration = BIBLE_STUDY_DURATION,
  eventGroupingId,
  attendanceReminder,
  weeksInTerm,
}: {
  name: string,
  groupId: number,
  startDate: Date,
  day: string,
  department: number,
  duration?: number,
  eventGroupingId: number,
  attendanceReminder: boolean,
  weeksInTerm: number,
}) {
  // Let groups run for two hours
  const endDate = new Date(startDate.getTime() + duration * ONE_HOUR)
  const recurrenceEnd = new Date(startDate.getTime() + ONE_WEEK * weeksInTerm - ONE_DAY)

  // - For some reason, and contrary to (some of) the official documentation, this endpoint only
  //   accepts data in application/x-www-form-urlencoded format
  // - The CCB API also fails to correctly decode the date fields from this data format so we
  //   need to manually avoid encoding only those fields *facepalm*
  const uri = getURI('create_event')
  const dataMain = getURIEncodedData({
    name,
    group_id: groupId,
    recurrence_type: 'weekly',
    recurrence_day_of_week: day.toLowerCase().slice(0, 3),
    department_id: department,
    event_grouping_id: eventGroupingId,
    attendance_reminder: attendanceReminder,
  })
  const dataDates = [
    `start_date=${formatDateAndTime(startDate)}`,
    `end_date=${formatDateAndTime(endDate)}`,
    `recurrence_end_date=${formatDateAndTime(recurrenceEnd)}`,
  ].join('&')
  const data = `${dataMain}&${dataDates}`

  const result = await axios.post(uri, data)
  const response = parseXMLResponse(result.data)
  const event = response.event
  if (!event) {
    raiseErrorFromAPI(response)
    console.error(result.data)
    throw new Error('Could not find event details in response')
  }
}

export async function createEventForGroup(group: CreateGroupData, groupId: number) {
  const day = group.day.toLowerCase().slice(0, 3)
  const dayIndex = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].indexOf(day)
  const startHour = group.time
  if (dayIndex < 0 || Number.isNaN(startHour)) {
    throw new Error(`Unknown day: ${day}`)
  }
  const startHourAdjusted = startHour > 7 ? startHour : startHour + 12
  const startDate = new Date((
    TERM_START_DATE.getTime()
    + ONE_DAY * dayIndex
    + ONE_HOUR * startHourAdjusted
  ))
  const department = getDepartmentId(group.department)
  await createEvent({
    attendanceReminder: true,
    day: group.day,
    department,
    eventGroupingId: getAttendanceGroup(group.faculty),
    groupId,
    name: group.name,
    startDate,
    weeksInTerm: WEEKS_IN_TERM,
  })
}

function getId(node: any) {
  const id = parseInt(node['@_id'])
  if (Number.isNaN(id)) {
    throw new Error(`Could not parse id (${id}) as int`)
  }
  return id
}

function getName(node: any) {
  return node.name || ''
}

function getMembershipType(node: any) {
  return node.membership_type?.['#text'] || ''
}

function getIdAndName(node: any): [number, string] {
  return [getId(node), getName(node)]
}

function getIdAndType(node: any): [number, string] {
  return [getId(node), getMembershipType(node)]
}

export async function getRecentGroups(since?: Date) {
  const recent = new Date(Date.now() - ONE_DAY * 30)
  const uri = getURI('group_profiles', {
    modified_since: formatDate(since || recent),
    include_participants: 'false',
  })
  const result = await axios.get(uri)

  const response = parseXMLResponse(result.data)
  const groups = response.groups?.group
  if (!groups) {
    raiseErrorFromAPI(response)
    console.error(result.data)
    throw new Error('Could not find group details in response')
  }
  const isActiveGroup = (group: any) => group.inactive !== 'true'
  const idsAndNames = groups.filter(isActiveGroup).map(getIdAndName)
  return idsAndNames
}

export async function getRecentEvents(since?: Date) {
  const recent = new Date(Date.now() - ONE_DAY * 30)
  const uri = getURI('event_profiles', {
    modified_since: formatDate(since || recent),
  })
  const result = await axios.get(uri)

  const response = parseXMLResponse(result.data)
  const events = response.events?.event
  if (!events) {
    raiseErrorFromAPI(response)
    console.error(result.data)
    throw new Error('Could not find event details in response')
  }
  const idsAndNames = events.map(getIdAndName)
  return idsAndNames
}

export async function removeMember({
  group,
  member,
}: {
  group: number,
  member: number,
}) {
  const uri = getURI('remove_individual_from_group', {
    id: member,
    group_id: group,
  })
  const result = await axios.post(uri)
  const response = parseXMLResponse(result.data)
  const groups = response.groups?.group || response.group
  if (!groups) {
    raiseErrorFromAPI(response)
    console.error(result.data)
    throw new Error('Could not find group details in response')
  }
}

export async function getCarplsData(savedSearchId: number) {
  const uri = getURI('execute_advanced_search', {
    id: savedSearchId,
  })
  const result = await axios.get(uri)
  const response = parseXMLResponse(result.data)
  const individuals = response.individuals?.individual
  if (!individuals) {
    console.error(result.data)
    throw new Error('Could not find data for individuals in response')
  }
  const idsAndType = (individuals as any[]).map(getIdAndType)
  return idsAndType
}
