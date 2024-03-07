import type { APIGatewayProxyEvent } from 'aws-lambda'
import { ApiGatewayManagementApi, GoneException } from '@aws-sdk/client-apigatewaymanagementapi'
import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb'
import { scryptSync, timingSafeEqual } from 'crypto'
import {
  checkLoggedIn,
  deleteConnection,
  getOtherConnections,
  register,
} from './connections'
import {
  addGroupMembers,
  CacheKeyType,
  createEventForGroup,
  createGroup,
  getCarplsData,
  inactivateGroup,
  loadGeneralData,
  removeMember,
  removeOldGroupMembers,
  setGroupLeaders,
  updateGroup,
} from './ccb'
import { DIRECTOR_ID, FACULTY_SAVED_SEARCH_IDS } from './constants'
import CCBDataCache from './CCBDataCache'
import { StateManager } from './StateManager'
import type {
  CreateGroupData,
  ProgressResponse,
  RequestBody,
  ResponseBody,
  StateProjection,
} from './types'
import {
  getCampusId,
  getDepartmentId,
  getGroupTypeId,
  getSessionId,
  ONE_MINUTE,
} from './util'
import type { BGFActionWithId } from '../src/sync/bgfActions'
import { getCache, setCache, updateCache } from './dbCache'
import patcher from '../src/jsonUtil'
import { applyActions, configureApplyActions } from '../src/sync/applyAction'
import { ObjectDelta } from 'jsondiffpatch'
import {
  applyProjection,
  getProjectionFromDiff,
  getStateHashes,
} from '../src/state/util'

const MAX_PATCH_ATTEMPTS = 5

type CacheType = CCBDataCache<CacheKeyType, [number, string][]>
const KEY_CARPLS = 'carpls'
const KEY_LAST_SEARCH_ID = 'lastExecuteSearchId'
const KEY_LAST_REFRESH = 'lastRefreshCompleted'

class RequestHandler {
  private apigw: ApiGatewayManagementApi
  private body: RequestBody
  private ccbCache: CacheType | null
  private connection: string
  private session: string

  constructor(event: APIGatewayProxyEvent, body: RequestBody) {
    const { domainName, stage } = event.requestContext
    this.apigw = new ApiGatewayManagementApi({
      apiVersion: '2018-11-29',
      endpoint: `https://${domainName}/${stage}`,
    })
    this.body = body
    this.ccbCache = null
    this.connection = event.requestContext.connectionId!
    this.session = body.session || ''

    if (!body.session && body.action !== 'register' && body.action !== 'password') {
      throw new Error('Received request with no session')
    }
    configureApplyActions({ bias: 'end' })
  }

  get handlers(): Record<RequestBody['action'], () => Promise<void>> {
    return {
      carpls: this.handleGetCarplsData.bind(this),
      register: this.register.bind(this),
      request: this.sendState.bind(this),
      syncAction: this.applyAction.bind(this),
      password: this.checkPassword.bind(this),
      create: this.handleCreateGroup.bind(this),
      remove: this.handleRemoveGroup.bind(this),
      check: this.handleCheckState.bind(this),
    }
  }

  private getCCBAPI(refreshCache?: boolean): CacheType | Promise<CacheType> {
    if (this.ccbCache) {
      return this.ccbCache
    }
    const refreshCacheItems: CacheKeyType[] = refreshCache ? ['groups'] : []
    return loadGeneralData(refreshCacheItems).then(cache => {
      this.ccbCache = cache
      return cache
    })
  }

  async applyAction() {
    if (!this.body.data) {
      throw new Error('Received syncAction request but no body to syncAction')
    }
    if (this.body.action !== 'syncAction') {
      throw new Error(`Handler "syncAction" called but action is: ${this.body.action}`)
    }

    await this.applyActionWithRetry(this.body.data.actions)
  }

  private async applyActionWithRetry(
    actions: BGFActionWithId[],
    maxAttempts = MAX_PATCH_ATTEMPTS,
  ): Promise<boolean> {
    let attempt = 0
    let state: StateManager = await StateManager.load(this.session)
    let stateProjection: StateProjection | undefined
    for (; attempt < maxAttempts; ++attempt) {
      try {
        const newState = applyActions(state.state, actions)
        const diff = patcher.diff(state.state, newState) as ObjectDelta
        if (!diff) {
          // eslint-disable-next-line no-await-in-loop
          await this.post({
            type: 'sync-failed',
            actions: actions.map(a => a.id),
            content: 'No diff generated',
            reason: 'no-diff',
            session: this.session,
          })
          break
        }

        stateProjection = getProjectionFromDiff(diff)
        // eslint-disable-next-line no-await-in-loop
        await state.applyDiff(diff)
        // eslint-disable-next-line no-await-in-loop
        await this.broadcastActions(state, actions, stateProjection)
        break
      } catch (error) {
        if (!(error instanceof ConditionalCheckFailedException)) {
          console.error('Unexpected error resolving sync request')
          console.error(error)

          // eslint-disable-next-line no-await-in-loop
          await this.post({
            type: 'sync-failed',
            actions: actions.map(a => a.id),
            content: `Received unexpected error: ${(error as Error).message}`,
            reason: 'error',
            session: this.session,
          })
          // eslint-disable-next-line no-await-in-loop
          await this.sendState(state)

          break
        }
      }

      // eslint-disable-next-line no-await-in-loop
      state = await StateManager.load(this.session)
    }
    if (attempt === maxAttempts) {
      await this.post({
        type: 'sync-failed',
        actions: actions.map(a => a.id),
        content: 'Max attempts to apply change exceeded',
        reason: 'max-attempts',
        session: this.session,
      })
      await this.sendState(undefined, stateProjection)
      return false
    }

    return true
  }

  async register() {
    if (this.body.action !== 'register') {
      throw new Error(`Handler "register" called but action is: ${this.body.action}`)
    }

    const correctPassword = this.isCorrectPassword(this.body.data)
    if (!correctPassword) {
      await this.post({
        type: 'login',
        content: false,
        session: this.session ?? '',
      })
      return
    }

    // Create or load the state for this session
    let state: StateManager
    if (!this.session) {
      this.session = getSessionId()
      state = await StateManager.create({ session: this.session })
    } else {
      state = await StateManager.load(this.session)
    }

    // Register this connection
    await register(this.session, this.connection)

    // Send feedback to client
    await this.post({ type: 'registration-success', session: this.session, content: true })
    await this.sendState(state)
  }

  async sendState(
    state?: StateManager,
    projection?: StateProjection,
    actions?: BGFActionWithId[],
    checkId?: string,
  ) {
    const stateToUse = state ?? await StateManager.load(this.session)
    const stateSegment = applyProjection(stateToUse.state, projection)
    const versions = stateToUse.getVersions(checkId ? undefined : projection)
    await this.post(
      {
        type: 'state',
        content: stateSegment,
        session: this.session,
        versions,
        actions: actions?.map(a => a.id),
        checkId,
      },
    )
  }

  async handleCheckState() {
    if (this.body.action !== 'check') {
      throw new Error('Invalid action to check state hash')
    }

    const state = await StateManager.load(this.session)
    const stateHashes = getStateHashes(state.state)
    const diff = patcher.diff(this.body.data, stateHashes) as ObjectDelta
    if (diff) {
      const hashFailureProjection = getProjectionFromDiff(diff)
      await this.sendState(
        state,
        hashFailureProjection,
        undefined,
        this.body.checkId,
      )
    } else {
      await this.post({
        type: 'check-success',
        session: this.session,
        content: true,
        checkId: this.body.checkId,
      })
    }
  }

  async checkPassword() {
    if (this.body.action !== 'password') {
      throw new Error(`Handler "login" called but action is: ${this.body.action}`)
    }

    const success = this.isCorrectPassword(this.body.data)

    await this.post({
      type: 'login',
      content: success,
      session: this.session ?? '',
    })
  }

  private isCorrectPassword(password: string) {
    const salt = process.env.BGF_PASSWORD_SALT!
    const attempt = scryptSync(password, salt, 64)

    const correctPasswordHash = Buffer.from(process.env.BGF_PASSWORD_HASH!, 'base64')
    return timingSafeEqual(attempt, correctPasswordHash)
  }

  async handleRemoveGroup() {
    if (this.body.action !== 'remove') {
      throw new Error(`Handler "remove" called but action is: ${this.body.action}`)
    }
    const groupId = this.body.data.groupId
    if (!await checkLoggedIn(this.session)) {
      const message = 'Not logged in or incorrect password'
      await this.progress({
        type: 'failed',
        id: groupId.toString(),
        message,
      })
      throw new Error(message)
    }

    const lockAcquired = await StateManager.acquireOrRenewAPILock(this.session, this.connection)
    if (!lockAcquired) {
      const message = (
        'Another user in this session is currently using the CCB API. '
        + 'Please try again later.'
      )
      await this.progress({
        type: 'failed',
        id: `remove-${groupId}`,
        message,
      })
      throw new Error(message)
    }

    try {
      await this.inactivateGroup(groupId)
    } finally {
      await StateManager.releaseAPILock(this.session, this.connection)
    }
  }

  async handleCreateGroup() {
    if (this.body.action !== 'create') {
      throw new Error(`Handler "create" called but action is: ${this.body.action}`)
    }
    const group = this.body.data
    if (!await checkLoggedIn(this.session)) {
      const message = 'Not logged in or incorrect password'
      await this.progress({
        type: 'failed',
        id: group.name,
        message,
      })
      throw new Error(message)
    }

    const lockAcquired = await StateManager.acquireOrRenewAPILock(this.session, this.connection)
    if (!lockAcquired) {
      const message = (
        'Another user in this session is currently using the CCB API. '
        + 'Please try again later.'
      )
      await this.progress({
        type: 'failed',
        id: group.name,
        message,
      })
      throw new Error(message)
    }

    try {
      await this.createOrUpdateGroup(group)
    } finally {
      await StateManager.releaseAPILock(this.session, this.connection)
    }
  }

  async handleGetCarplsData() {
    if (this.body.action !== 'carpls') {
      throw new Error(`Handler "carpls" called but action is: ${this.body.action}`)
    }
    if (!await checkLoggedIn(this.session)) {
      throw new Error('Not logged in or incorrect password')
    }

    try {
      const carpls = await this.loadCarplsData()
      await this.post({
        type: 'carpls',
        session: this.session,
        content: carpls,
      })
    } finally {
      await StateManager.releaseAPILock(this.session, this.connection)
    }
  }

  private async post(data: ResponseBody, connection?: string) {
    const connectionId = connection ?? this.connection
    try {
      await this.apigw.postToConnection({
        ConnectionId: connectionId,
        Data: JSON.stringify(data),
      })
    } catch (error) {
      if (error instanceof GoneException) {
        await deleteConnection(this.session!, connectionId)
      } else {
        throw error
      }
    }
  }

  private broadcastActions(
    state: StateManager,
    actions: BGFActionWithId[],
    projection?: StateProjection,
  ) {
    const versions = state.getVersions(projection)
    return Promise.all([
      this.post({
        type: 'sync-success',
        actions: actions.map(a => a.id),
        session: this.session,
        versions,
      }),
      this.broadcastToConnections(
        ({ conn, session }) => this.post({
          type: 'action',
          content: actions,
          session,
          versions,
        }, conn),
      )
    ])
  }

  private async broadcastToConnections(
    broadcastFunc: (
      params: { conn: string, session: string },
    ) => Promise<void>,
  ) {
    const session = this.session
    const connections = await getOtherConnections(session, this.connection)
    const broadcastPromises: Promise<unknown>[] = []
    const connectionsToDelete: string[] = []
    for (const conn of connections) {
      broadcastPromises.push(
        broadcastFunc({ conn, session }).catch(
          error => {
            console.error(`Failed to push to connection ${conn}`, error)
            if (error instanceof GoneException) {
              connectionsToDelete.push(conn)
            }
            return null
          },
        ),
      )
    }
    await Promise.all(broadcastPromises)
    for (const conn of connectionsToDelete) {
      // eslint-disable-next-line no-await-in-loop
      await deleteConnection(session, conn).catch(
        error => console.error(`Failed to delete connection: ${conn} ${error}`),
      )
    }
  }

  private progress(content: ProgressResponse['content']) {
    return this.post({
      type: 'progress',
      content,
      session: this.session!,
    })
  }

  private getLeaders(group: CreateGroupData) {
    return group.members.filter(m => (
      group.groupType === 'Prayer Group' ? m.prayerLeader : m.leader
    )).map(m => parseInt(m.ccbId))
  }

  async createOrUpdateGroup(group: CreateGroupData) {
    await this.progress({
      type: 'started',
      id: group.name,
    })

    const ccb = await this.getCCBAPI(group.refreshCache)
    const existingGroups = (await ccb.get('groups'))!
    const groupExists = existingGroups.filter(
      ([id, name]) => (group.ccbId ? id === group.ccbId : name === group.name),
    )

    try {
      if (groupExists.length === 0) {
        await this.createGroup(group)
      } else {
        const groupId = groupExists[0][0]
        await this.progress({
          type: 'exists',
          id: group.name,
          message: 'Group already exists. Updating...',
          groupId,
        })

        await this.updateGroup(group, groupId)
      }

      await this.progress({
        type: 'completed',
        id: group.name,
      })
    } catch (error) {
      await this.progress({
        type: 'failed',
        id: group.name,
        message: (error as Error).message,
      })
      console.error(`Error while creating/updating group: ${JSON.stringify(group)}`)
      throw error
    }
  }

  async createGroup(group: CreateGroupData) {
    const leaders = this.getLeaders(group)
    const mainLeader = leaders[0]
    const campus = getCampusId(group.campus)
    const departmentId = getDepartmentId(group.department)
    const groupType = getGroupTypeId(group.ccbType)

    const groupId = await createGroup({
      campus,
      departmentId,
      groupType,
      interactionType: 'Announcement Only',
      mainLeader,
      name: group.name,
    })

    if (DIRECTOR_ID && !group.members.some(m => m.ccbId === DIRECTOR_ID?.toString())) {
      await removeMember({
        group: groupId,
        member: DIRECTOR_ID,
      })
    }

    await this.progress({
      type: 'group',
      id: group.name,
      groupId,
    })

    await createEventForGroup(group, groupId)

    await this.progress({
      type: 'event',
      id: group.name,
    })

    await this.updateGroupMembers(group, groupId)
  }

  async updateGroup(group: CreateGroupData, groupId: number) {
    const leaders = this.getLeaders(group)

    await updateGroup({
      group,
      groupId,
      mainLeader: leaders[0],
    })
    await this.progress({
      type: 'group',
      id: group.name,
    })

    await removeOldGroupMembers({
      group: groupId,
      members: group.members.map(m => parseInt(m.ccbId)),
      callback: member => this.progress({
        type: 'remove-member',
        id: group.name,
        message: `Removed ${member} from the group`,
      }),
    })

    await this.updateGroupMembers(group, groupId)
  }

  async inactivateGroup(groupId: number) {
    try {
      await inactivateGroup({
        groupId,
      })
      await this.progress({
        type: 'inactivated',
        id: `remove-${groupId}`,
      })
    } catch (error) {
      await this.progress({
        type: 'failed',
        id: `remove-${groupId}`,
        message: `Failed to inactivate group ${groupId}`,
      })
    }
  }

  async updateGroupMembers(group: CreateGroupData, groupId: number) {
    const leaders = this.getLeaders(group)

    await addGroupMembers({
      group: groupId,
      members: group.members.map(m => parseInt(m.ccbId)),
      callback: () => this.progress({
        type: 'member',
        id: group.name,
      }),
    })

    await setGroupLeaders({
      group: groupId,
      leaders,
    })

    await this.addToCampusLeadersGroup(group)

    await this.progress({
      type: 'leaders',
      id: group.name,
    })
  }

  private async addToCampusLeadersGroup(group: CreateGroupData) {
    const leaders = this.getLeaders(group)
    const ccb = await this.getCCBAPI()
    const groups = await ccb.get('groups')
    const currentYear = new Date().getFullYear().toString()
    const campusLeadersGroup = groups?.filter(
      ([, name]) => (
        name.startsWith(currentYear)
        && name.toLowerCase().endsWith('campus leaders')
      ),
    )
    if (!campusLeadersGroup || campusLeadersGroup?.length === 0) {
      console.warn('Could not find the campus leaders group')
      return
    } else if (campusLeadersGroup.length > 1) {
      const message = (
        `Found multiple campus leaders groups. Choosing: ${campusLeadersGroup[0][1]}`
      )
      await this.progress({
        type: 'warning',
        id: group.name,
        message,
      })
      console.warn(message)
    }
    const groupId = campusLeadersGroup[0][0]
    await addGroupMembers({
      group: groupId,
      members: leaders,
    }).catch(error => {
      const message = `Failed to add leaders to campus leaders group (id: ${groupId})`
      console.warn(message)
      console.error(error)
      return this.progress({
        type: 'warning',
        id: group.name,
        message,
      })
    })
  }

  private async loadCarplsData() {
    // Refresh CARPLS data slightly and return all CARPLS data
    const lastUpdatePromise = getCache<number>(KEY_LAST_SEARCH_ID)
    const carplsPromise = getCache<Record<string, string>>(KEY_CARPLS)
    const lastRefreshPromise = getCache<number>(KEY_LAST_REFRESH)
    const lockAcquired = await StateManager.acquireOrRenewAPILock(
      this.session!,
      this.connection,
    )
    const lastRefresh = (await lastRefreshPromise)?.value
    const shouldRefresh = (
      (lastRefresh ?? 0) < Date.now() - ONE_MINUTE * 5
      && lockAcquired
    )

    let newCarpls: Record<number, string> | null = null
    const promisesToAwait: Promise<void>[] = []
    if (shouldRefresh) {
      const lastUpdateId = (await lastUpdatePromise)?.value
      const [thisUpdateId, isLastInSeries] = this.getNextSearchId(lastUpdateId)
      const newCarplsData = await getCarplsData(thisUpdateId).catch(console.error)
      if (newCarplsData?.length) {
        newCarpls = Object.fromEntries(newCarplsData)
      }

      promisesToAwait.push(setCache(KEY_LAST_SEARCH_ID, thisUpdateId))
      if (isLastInSeries) {
        promisesToAwait.push(setCache(KEY_LAST_REFRESH, Date.now()))
      }
    }

    const oldCarpls = await carplsPromise
    if (newCarpls) {
      if (!oldCarpls) {
        await setCache(KEY_CARPLS, newCarpls)
      } else {
        await updateCache(
          KEY_CARPLS,
          oldCarpls.value,
          oldCarpls.version,
          old => ({ ...old, ...newCarpls }),
        )
      }
    }
    await Promise.all(promisesToAwait)

    return { ...oldCarpls?.value, ...newCarpls }
  }

  private getNextSearchId(lastUpdate: number | undefined): [number, boolean] {
    const lastUpdateIndex = lastUpdate ? FACULTY_SAVED_SEARCH_IDS.indexOf(lastUpdate) : -1
    const nextUpdateIndex = (lastUpdateIndex + 1) % FACULTY_SAVED_SEARCH_IDS.length
    const nextUpdate = FACULTY_SAVED_SEARCH_IDS[nextUpdateIndex]
    const isLastInSeries = nextUpdateIndex === FACULTY_SAVED_SEARCH_IDS.length - 1
    return [nextUpdate, isLastInSeries]
  }
}

export default RequestHandler
