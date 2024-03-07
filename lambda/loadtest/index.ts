import { readFileSync } from 'fs'
import { performAutoGenerate } from '../../src/autogenerate/autoGenerate'
import patcher from '../../src/jsonUtil'
import { ALL_CAMPUSES, GroupMember, setPeople } from '../../src/state/people'
import { getTimeOptions } from '../../src/state/selectors'
import { setPassword } from '../../src/state/ui'
import { setupStore } from '../../src/store'
import SyncManager from '../../src/sync/SyncManager'
import { NOT_IN_A_GROUP_ID, getGroupId } from '../../src/util'
import { createContext } from '../../src/sync/applyAction'

/* eslint-disable no-await-in-loop, no-console */

if (!process.env.BGF_PASSWORD) {
  throw new TypeError('BGF_PASSWORD not set')
}

let testDataPeople: GroupMember[] = []

class HackedSyncManager extends SyncManager {
  declare store: SyncManager['store']
  declare shouldRequestCarpls: boolean
  declare verbose: boolean
}

async function waitFor<T>(
  getStatus: () => T,
  predicate: (status: T) => boolean = Boolean,
  timeout = 5000,
  progress?: (status: T) => string,
) {
  const startTime = Date.now()
  return new Promise((resolve, reject) => {
    let lastProgress = ''

    const interval = setInterval(() => {
      const status = getStatus()
      if (predicate(status)) {
        clearInterval(interval)
        resolve(null)
      }
      if (Date.now() - startTime > timeout) {
        clearInterval(interval)
        console.log(
          `Waiting for:\n  - ${getStatus.toString()}\n  - ${predicate.toString()}`,
        )
        reject(
          new Error(
            `Timed out with status ${JSON.stringify(status, null, 2)}`,
          ),
        )
      }
      const progressMessage = progress?.(status)
      if (progressMessage && progressMessage !== lastProgress) {
        lastProgress = progressMessage
        console.info(progressMessage)
      }
    }, 100)
  }).catch((error: Error) => {
    // Re-throw error with a proper
    throw new Error(error.message)
  })
}

function waitForClean(clients: HackedSyncManager[]) {
  return waitFor(
    () => clients.map(c => c.isCleanState),
    result => result.every(Boolean),
  )
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function createClient(session?: string) {
  const store = setupStore()
  store.dispatch(setPassword(process.env.BGF_PASSWORD!))
  const sync = new HackedSyncManager({ customStore: store, verbose: true })
  sync.shouldRequestCarpls = false
  store.dispatch(setPeople(testDataPeople))
  sync.register(session)
  await waitFor(() => sync.connected)
  return sync
}

async function testDataSelection(client: HackedSyncManager) {
  const randomSelector = Math.random()
  if (
    randomSelector < 0.1
    && client.store.getState().people.customPeople.length > 0
  ) {
    // Edit latest custom person
    console.log(`[${client.id}] Edit latest custom person`)
    const customPeople = client.store.getState().people.customPeople
    client.syncActions({
      type: 'updateCustom',
      content: {
        firstName: Math.random().toString(),
        lastName: Math.random().toString(),
        ccbId: Math.random().toString(),
      },
      person: customPeople[customPeople.length - 1].responseId,
    })
  } else if (
    randomSelector < 0.2
    && client.store.getState().people.customPeople.length > 0
  ) {
    // Delete custom person
    console.log(`[${client.id}] Delete custom person`)
    const customPeople = client.store.getState().people.customPeople
    const index = Math.floor(Math.random() * customPeople.length)
    client.syncActions({
      type: 'removeCustom',
      person: customPeople[index].responseId,
    })
  } else if (randomSelector < 0.4) {
    // Create new custom person
    console.log(`[${client.id}] Create new custom person`)
    const id = `c-${Math.random().toString().slice(2, 8)}`
    const array = client.store.getState().people.customPeople.map(p => p.responseId)
    client.syncActions({
      type: 'addCustom',
      person: {
        firstName: '',
        lastName: '',
        ccbId: '',
        times: [],
        prayerTimes: [],
        comments: '',
        extraOptions: [],
        leader: true,
        prayerLeader: true,
        faculty: '',
        degree: '',
        gender: 'm',
        year: '',
        custom: true,
        responseId: id,
        previous: [],
      },
      context: createContext({
        array,
        index: array.length,
        item: id,
      }),
    })
  } else if (
    randomSelector < 0.5
    && client.store.getState().faculties.length > 0
  ) {
    // Remove faculty
    console.log(`[${client.id}] Remove faculty`)
    const faculties = client.store.getState().faculties
    const index = Math.floor(Math.random() * faculties.length)
    const toRemove = faculties[index]
    client.syncActions({
      type: 'removeFaculty',
      faculty: toRemove,
    })
  } else if (randomSelector < 0.7) {
    // Add faculty
    console.log(`[${client.id}] Add faculty`)
    const allFaculties = Array.from(
      new Set(
        testDataPeople.map(p => p.faculty),
      ),
    ).filter(f => !!f).sort()
    const index = Math.floor(Math.random() * allFaculties.length)
    const newFaculty = allFaculties[index]
    client.syncActions({
      type: 'addFaculty',
      faculty: newFaculty,
    })
  } else if (randomSelector < 0.8) {
    // Change group type
    console.log(`[${client.id}] Change group type`)
    client.syncActions({
      type: 'setGroupType',
      value: Math.random() < 0.5 ? 'Bible Study' : 'Prayer Group',
    })
  } else if (
    randomSelector < 0.9
    && client.store.getState().campuses.length > 0
  ) {
    // Remove campus
    console.log(`[${client.id}] Remove campus`)
    const campuses = client.store.getState().campuses
    const index = Math.floor(Math.random() * campuses.length)
    const toRemove = campuses[index]
    client.syncActions({
      type: 'removeCampus',
      campus: toRemove,
    })
  } else {
    // Add campus
    console.log(`[${client.id}] Add campus`)
    const campus = ALL_CAMPUSES[Math.floor(Math.random() * ALL_CAMPUSES.length)]
    client.syncActions({
      type: 'addCampus',
      campus,
    })
  }
}

async function setupGroupActions(clients: HackedSyncManager[]) {
  clients.forEach(c => c.verbose = false)

  const client = clients[0]
  const allPeople = client.store.getState().people.people
  const groupType = client.store.getState().groupType
  const peopleMap = new Map(allPeople.map(p => [p.responseId, p]))
  const allTimeOptions = getTimeOptions(
    allPeople,
    true,
    ALL_CAMPUSES,
    groupType,
  )

  performAutoGenerate({
    groupType,
    initialGroups: {},
    peopleToAssign: allPeople,
    peopleMap,
    allPossibleTimes: allTimeOptions,
    sync: client,
  })

  await waitFor(
    () => clients.map(c => Object.keys(c.state.groups).length),
    result => result.every(c => c > 1),
  )
  await waitForClean(clients)

  clients.forEach(c => c.verbose = true)
}

async function testGroupActions(client: HackedSyncManager) {
  const allPeople = client.store.getState().people.people
  const groupType = client.store.getState().groupType
  const allTimeOptions = getTimeOptions(
    allPeople,
    true,
    ALL_CAMPUSES,
    groupType,
  )

  const groupCount = Object.keys(client.state.groups).length
  const randomSelector = Math.random()
  if (randomSelector < 0.1) {
    // Create new group
    console.log(`[${client.id}] Creating new group`)
    const time = allTimeOptions[Math.floor(Math.random() * allTimeOptions.length)]
    const index = (
      Object.values(client.state.groups)
        .filter(g => g.time.time === time.time).length
    )
    client.syncActions([{
      type: 'addGroup',
      group: {
        id: getGroupId(time, index),
        ccbId: 0,
        members: [],
        time,
      },
    }])
  } else if (
    randomSelector < 0.2
    && groupCount > 1
  ) {
    // Remove group
    console.log(`[${client.id}] Removing group`)
    const groupIndex = Math.floor(Math.random() * groupCount)
    const group = Object.values(client.state.groups)[groupIndex]
    if (group.id !== NOT_IN_A_GROUP_ID) {
      client.syncActions([{
        type: 'removeGroup',
        group: group.id,
      }])
    }
  } else if (randomSelector < 0.3) {
    // Patch group
    console.log(`[${client.id}] Patching group`)
    const groupIndex = Math.floor(Math.random() * groupCount)
    const group = Object.values(client.state.groups)[groupIndex]
    const ccbId = Math.floor(Math.random() * 1000000)
    client.syncActions([{
      type: 'patchGroup',
      group: group.id,
      content: { ccbId },
    }])
  } else if (randomSelector < 0.4) {
    // Sort group
    console.log(`[${client.id}] Sorting group`)
    const groupIndex = Math.floor(Math.random() * groupCount)
    const group = Object.values(client.state.groups)[groupIndex]
    const order = group.members.slice().sort()
    client.syncActions([{
      type: 'sortGroup',
      group: group.id,
      order,
    }])
  } else {
    // Move member
    console.log(`[${client.id}] Moving member`)
    const member = allPeople[Math.floor(Math.random() * allPeople.length)]

    const toGroupIndex = Math.floor(Math.random() * groupCount)
    const toGroup = Object.values(client.state.groups)[toGroupIndex]

    const toGroupMembers = toGroup.members.filter(m => m !== member.responseId)
    const toMemberIndex = Math.floor(Math.random() * (toGroupMembers.length + 1))

    client.syncActions([{
      type: 'moveMember',
      member: member.responseId,
      group: toGroup.id,
      context: createContext({
        array: toGroupMembers,
        index: toMemberIndex,
        item: member.responseId,
      }),
    }])
  }
}

function loadTestData() {
  const content = readFileSync('./lambda/loadtest/data/people.json', 'utf8')
  testDataPeople = JSON.parse(content)
}

async function main() {
  loadTestData()

  const clientsToCreate = 5
  const client = await createClient()
  const clients = await Promise.all([
    client,
    ...new Array(clientsToCreate - 1).fill(0).map(() => createClient(client.session))
  ])

  console.log(`[${client.id}] Clients created: ${clients.map(c => c.id).join(', ')}`)

  await Promise.all(clients.map(async c => {
    for (let i = 0; i < 10; i++) {
      await testDataSelection(c).catch(
        error => {
          console.warn(`[${c.id}] Caught local error: ${error}`)
          console.warn(error)
        }
      )
      await sleep(700)
    }
  }))
  await waitForClean(clients)
  await waitFor(
    () => {
      const states = clients.map(c => c.state)
      const diffs = states.map(s => patcher.diff(s, states[0]))
      return diffs
    },
    result => result.every(s => s === undefined),
    5000,
  )

  await setupGroupActions(clients)

  await Promise.all(clients.map(async c => {
    for (let i = 0; i < 10; i++) {
      await testGroupActions(c).catch(
        error => {
          console.warn(`[${c.id}] Caught local error: ${error}`)
          console.warn(error)
        }
      )
      await sleep(500)
    }
  }))
  await waitForClean(clients)
  await waitFor(
    () => {
      const states = clients.map(c => c.state)
      const diffs = states.map(s => patcher.diff(s, states[0]))
      return diffs
    },
    result => result.every(s => s === undefined),
    5000,
  )

  clients.forEach(c => c.close())
}

main()
