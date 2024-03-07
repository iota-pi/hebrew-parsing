import debounce from 'debounce'
import hashObject from 'object-hash'
import ReconnectingWebSocket from 'reconnecting-websocket'
import type { Action } from 'redux'
import WS from './_socket.cjs'
import store, { type AppStore } from '../store'
import { SYNC_ENDPOINT, getRandomId } from '../util'
import type {
  ActionResponse,
  CarplsResponse,
  CreateGroupData,
  LoginResponse,
  ProgressCallback,
  ProgressResponse,
  ProgressType,
  RegistrationResponse,
  RequestBody,
  StandardRequestWithoutSession,
  RequestStateResponse,
  ResponseBody,
  SyncState,
  SyncFailedResponse,
  StateVersions,
  SyncSuccessResponse,
  CheckSuccessResponse,
} from '../../lambda/types'
import { setCCBIds, setGroups } from '../state/groups'
import { setCustomPeople, setEdits, updateCarpls } from '../state/people'
import { setFaculties } from '../state/faculty'
import { setCampuses } from '../state/campuses'
import { setMessage, setPassword, setSync } from '../state/ui'
import { setGroupType } from '../state/groupType'
import { BGFAction, BGFActionWithId, addActionIds } from './bgfActions'
import { applyActions } from './applyAction'
import { getStateHashes } from '../state/util'

export type SyncManagerOptions = {
  customStore?: AppStore,
  verbose?: boolean,
}
type ActionVersionTuple = [BGFAction, StateVersions]

class SyncManager {
  protected clientId: string
  protected ignoreActionsBefore: StateVersions | null
  protected isRequestingState: boolean
  protected waitingForCheck: string | null
  protected justRegistered: boolean
  protected localActions: BGFActionWithId[]
  protected loginCallback: ((value: boolean) => void) | null
  protected pendingActions: ActionVersionTuple[]
  protected progressListeners: Record<string, ProgressCallback[]>
  protected shouldRequestCarpls: boolean
  protected socket: ReconnectingWebSocket
  protected store: AppStore
  protected verbose: boolean

  constructor(options?: SyncManagerOptions) {
    const { customStore, verbose = false } = options ?? {}

    this.clientId = getRandomId()
    this.ignoreActionsBefore = null
    this.isRequestingState = false
    this.waitingForCheck = null
    this.justRegistered = false
    this.localActions = []
    this.loginCallback = null
    this.pendingActions = []
    this.progressListeners = {}
    this.shouldRequestCarpls = true
    this.socket = this.initSocket()
    this.store = customStore || store
    this.verbose = verbose
  }

  toString() {
    return `[SyncManager ${this.id}]`
  }

  get id() {
    return this.clientId
  }

  private info(content: string) {
    if (this.verbose) {
      console.info(`${performance.now()}: ${this} ${content}`)
    }
  }

  private initSocket() {
    const socket = new ReconnectingWebSocket(
      SYNC_ENDPOINT,
      [],
      {
        WebSocket: WS,
        minReconnectionDelay: 500,
      },
    )

    socket.addEventListener('open', () => {
      if (this.session) {
        this.register(this.session)
      }
      this.info('Connected')
    })
    socket.addEventListener('message', this.handleMessage.bind(this))
    socket.addEventListener(
      'error',
      error => this.info(`Error: ${JSON.stringify(error)}`),
    )
    socket.addEventListener('close', () => this.info('Closed.'))

    return socket
  }

  private sendRaw(message: RequestBody) {
    this.info(`Sending message: ${JSON.stringify(message)}`)
    try {
      this.socket.send(JSON.stringify(message))
    } catch (error) {
      console.error(error)
      console.warn('Failed to send message:', message)
    }
  }

  private send(request: StandardRequestWithoutSession) {
    if (!this.session) {
      console.warn(
        `Disconnected from session, not sending message: ${JSON.stringify(request)}`,
      )
      return
    }
    const message: RequestBody = {
      session: this.session,
      ...request,
    }
    this.sendRaw(message)

    if (this.socket.readyState === this.socket.CLOSED) {
      this.socket.reconnect()
    }
  }

  private getStore() {
    return this.store.getState()
  }

  get session() {
    return this.getStore().ui.syncSession
  }

  get state(): SyncState {
    const fullState = this.getStore()
    return {
      campuses: fullState.campuses,
      ccbIds: fullState.groups.ccbIds,
      customPeople: fullState.people.customPeople,
      edits: fullState.people.edits,
      faculties: fullState.faculties,
      groups: fullState.groups.groups,
      groupType: fullState.groupType,
    }
  }

  get connected() {
    return (
      this.socket.readyState === this.socket.OPEN
      && this.ignoreActionsBefore !== null
      && !!this.session
    )
  }

  get connecting() {
    return (
      this.socket.readyState === this.socket.OPEN
      && this.ignoreActionsBefore === null
      && this.isRequestingState
    )
  }

  get isCleanState() {
    return (
      !this.isRequestingState
      && this.waitingForCheck === null
      && this.localActions.length === 0
      && this.pendingActions.length === 0
    )
  }

  register(session: string | null = null) {
    if (this.justRegistered) {
      return
    }
    this.info('Registering')
    this.justRegistered = true
    setTimeout(
      () => {
        this.justRegistered = false
      },
      1000,
    )

    this.ignoreActionsBefore = null
    this.isRequestingState = true
    this.sendRaw({
      action: 'register',
      session,
      data: this.getAPIPassword(),
    })
  }

  get justAutoReconnected() {
    if (this.ignoreActionsBefore === null || this.isRequestingState) {
      return false
    }
    const result = this.justRegistered
    if (this.justRegistered) {
      this.justRegistered = false
    }
    return result
  }

  private queueCheckState() {
    this.waitingForCheck = getRandomId()
    this.sendCheckState()
  }

  private sendCheckState = debounce(
    () => {
      if (!this.waitingForCheck) {
        throw new Error('Missing check ID')
      }
      this.send({
        action: 'check',
        data: getStateHashes(this.state),
        checkId: this.waitingForCheck,
      })
    },
    1000,
  )

  syncActions(
    actions: BGFAction | (BGFAction | false | null | undefined)[],
  ) {
    const preparedActions = this.prepareActions(actions)
    this.syncPreparedActions(preparedActions)
    this.queueCheckState()
  }

  private prepareActions(
    actions: BGFAction | (BGFAction | false | null | undefined)[],
  ) {
    const actionsArray = Array.isArray(actions) ? actions : [actions]
    const filteredActions = actionsArray.filter(
      (a): a is Exclude<typeof a, undefined | null | false> => !!a,
    )
    return addActionIds(filteredActions)
  }

  private syncPreparedActions(actions: BGFActionWithId[]) {
    const newLocalState = applyActions(this.state, actions)
    this.updateStoreWithState(newLocalState)
    this.localActions.push(...actions)
    this.send({
      action: 'syncAction',
      data: { actions },
    })
  }

  private removeLocalActions(actions: string[] | BGFActionWithId[]) {
    const ids = (
      typeof actions[0] === 'string'
        ? (actions as string[])
        : (actions as BGFActionWithId[]).map(a => a.id)
    )
    this.localActions = this.localActions.filter(({ id }) => !ids.includes(id))
  }

  private requestCarpls = debounce(
    () => {
      this.send({ action: 'carpls' })
    },
    100000,
    true,
  )

  private handleRegistrationSuccess(data: RegistrationResponse) {
    this.store.dispatch(setSync(data.session))
    if (this.shouldRequestCarpls) {
      this.requestCarpls()
    }
  }

  private handleSyncFailed(data: SyncFailedResponse) {
    this.removeLocalActions(data.actions)
    if (data.reason === 'no-diff') {
      return
    }

    console.warn(`Sync failed with reason: ${data.reason}`)
    this.store.dispatch(setMessage({
      error: true,
      message: 'Failed to sync action, please try again',
    }))
  }

  private handleSyncSuccess(data: SyncSuccessResponse) {
    this.removeLocalActions(data.actions)
    this.patchVersions(data.versions)
  }

  private handleCheckSuccess({ checkId }: CheckSuccessResponse) {
    if (checkId === this.waitingForCheck) {
      this.waitingForCheck = null
      this.localActions = []
      this.pendingActions = []
    }
  }

  private handleState(data: RequestStateResponse) {
    const { actions, content, versions, checkId } = data
    this.isRequestingState = false
    if (checkId) {
      if (checkId === this.waitingForCheck) {
        this.waitingForCheck = null
        this.localActions = []
      } else {
        return
      }
    }

    this.patchVersions(versions)

    if (actions) {
      this.removeLocalActions(actions)
    }
    const workingState = {
      ...this.state,
      ...content,
      groups: {
        ...this.state.groups,
        ...content.groups,
      },
    }
    const newState = this.applyLocalActions(
      this.applyPendingActions(workingState, versions)
    )
    this.updateStoreWithState(newState)
  }

  private updateStoreWithState(content: SyncState) {
    const setters: {
      [K in keyof SyncState]: (value: SyncState[K]) => Action
    } = {
      campuses: setCampuses,
      ccbIds: setCCBIds,
      customPeople: setCustomPeople,
      edits: setEdits,
      faculties: setFaculties,
      groups: setGroups,
      groupType: setGroupType,
    }
    for (const rawKey of Object.keys(content)) {
      const key = rawKey as keyof SyncState
      if (
        (key === 'groupType' && content[key] !== this.state[key])
        || hashObject(content[key]) !== hashObject(this.state[key])
      ) {
        this.store.dispatch(
          (setters[key] as (value: SyncState[typeof key]) => Action)(content[key])
        )
      }
    }
  }

  private applyLocalActions(state: SyncState) {
    return applyActions(state, this.localActions)
  }

  private applyPendingActions(
    newState: SyncState,
    newStateVersion: StateVersions,
  ) {
    this.pendingActions = this.pendingActions.filter(
      ([_, versions]) => this.versionsAboveMin(versions, newStateVersion),
    )
    const actions = this.pendingActions.map(([a]) => a)
    return applyActions(newState, actions)
  }

  versionsAboveMin(versions: StateVersions, min?: StateVersions) {
    const minVersions = min ?? this.ignoreActionsBefore
    if (!minVersions) return true

    if (versions.length !== minVersions.length) {
      console.warn('Version lengths do not match', versions, minVersions)
    }

    const result = versions.some(
      (version, index) => {
        const minVersion = minVersions[index]
        if (typeof version === 'number' && typeof minVersion === 'number') {
          return version > minVersion
        } else if (typeof version === 'object' && typeof minVersion === 'object') {
          return Object.entries(version).some(
            ([key, value]) => value > (minVersion[key] ?? 0),
          )
        }

        // Treat a version object as always being greater than a version number
        return typeof version === 'object' && typeof minVersion === 'number'
      }
    )
    return result
  }

  patchVersions(versions: StateVersions) {
    if (!this.ignoreActionsBefore) {
      this.ignoreActionsBefore = versions
      return
    }

    const result: StateVersions = []
    for (let i = 0; i < versions.length; i++) {
      const version = versions[i]
      const minVersion = this.ignoreActionsBefore[i]
      if (
        typeof version === 'number'
        && typeof minVersion === 'number'
      ) {
        result.push(Math.max(minVersion, version))
      } else if (
        typeof version === 'object'
        && typeof minVersion === 'object'
      ) {
        const resultObj: Record<string, number> = {}
        for (const [key, value] of Object.entries(version)) {
          resultObj[key] = Math.max(minVersion[key] || 0, value)
        }
        result.push(resultObj)
      } else if (
        typeof version === 'object'
        && typeof minVersion === 'number'
      ) {
        result.push(version)
      } else {
        result.push(minVersion)
      }
    }
    this.ignoreActionsBefore = result
  }

  private handleAction(data: ActionResponse) {
    const { content: actions, versions } = data

    if (!this.versionsAboveMin(versions)) {
      this.info(`Ignoring action from old version.\nOld: ${JSON.stringify(this.ignoreActionsBefore)},\nCurrent: ${JSON.stringify(versions)}`)
      return
    }

    this.removeLocalActions(actions)
    const newState = this.applyLocalActions(
      applyActions(this.state, actions)
    )
    this.updateStoreWithState(newState)

    // Action type "setGroups" is conceptually similar to a full state sync,
    // so update the relevant version numbers and don't add to pending actions
    if (actions.some(({ type }) => type === 'setGroups')) {
      this.patchVersions(versions)
    } else {
      this.pendingActions.push(
        ...actions.map(a => [a, versions] satisfies ActionVersionTuple)
      )
    }
  }

  private handleCarpls(data: CarplsResponse) {
    this.store.dispatch(updateCarpls(data.content))
  }

  private handleLogin(data: LoginResponse) {
    if (!data.content) {
      this.store.dispatch(setPassword(''))
      this.store.dispatch(setMessage({
        error: true,
        message: 'Login attempt failed',
      }))
    }
    this.loginCallback?.(data.content)
  }

  abortLoginAttempt() {
    this.loginCallback?.(false)
    this.loginCallback = null
  }

  private handleProgress(data: ProgressResponse) {
    const callbackKey = this.getProgressKey(data.content.id, data.content.type)
    const callbacks = this.progressListeners[callbackKey] || []
    for (const callback of callbacks) {
      callback(data.content)
    }
  }

  private handleMessage(event: MessageEvent) {
    const handlers: {
      [K in ResponseBody['type']]: (data: ResponseBody & { type: K }) => void
    } = {
      'registration-success': this.handleRegistrationSuccess.bind(this),
      'sync-failed': this.handleSyncFailed.bind(this),
      'sync-success': this.handleSyncSuccess.bind(this),
      'check-success': this.handleCheckSuccess.bind(this),
      action: this.handleAction.bind(this),
      carpls: this.handleCarpls.bind(this),
      login: this.handleLogin.bind(this),
      progress: this.handleProgress.bind(this),
      state: this.handleState.bind(this),
    }

    const data = (
      JSON.parse(event.data) as (
        ResponseBody | {
          message: string,
          connectionId: string,
          requestId: string,
          type: undefined,
        }
      )
    )
    this.info(`Received message: ${JSON.stringify(data)}`)
    if (data.type === undefined) {
      if (data.message.toLowerCase().includes('internal server error')) {
        this.store.dispatch(setMessage({
          error: true,
          message: 'Internal server error. Please try again later.',
        }))
      }
      console.warn('Received message without type', data)
      return
    }

    if (
      this.session
      && data.session !== this.session
      && data.type !== 'registration-success'
    ) {
      return
    }

    const handler = handlers[data.type] as ((body: ResponseBody) => void) | undefined
    if (handler) {
      handler(data)
    } else {
      console.warn('Unknown event type received', data)
    }
  }

  private requestState() {
    this.send({ action: 'request' })
    this.isRequestingState = true
  }

  private getAPIPassword() {
    return this.store.getState().ui.apiPassword
  }

  checkPassword(password?: string): Promise<boolean> {
    return new Promise(resolve => {
      this.sendRaw({
        action: 'password',
        data: password ?? this.getAPIPassword(),
        session: null,
      })

      this.loginCallback = resolve
    })
  }

  removeGroup(id: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const resolveCallback = () => {
        resolve()
        this.removeProgressListener(`remove-${id}`, 'inactivated', resolveCallback)
      }
      this.addProgressListener(`remove-${id}`, 'inactivated', resolveCallback)
      const failedCallback: ProgressCallback = ({ message }) => {
        reject(new Error((
          message
            ? `Removing group failed with message ${message}`
            : 'Removing group failed'
        )))
        this.removeProgressListener(`remove-${id}`, 'failed', failedCallback)
      }
      this.addProgressListener(`remove-${id}`, 'failed', failedCallback)

      this.send({
        action: 'remove',
        data: { groupId: id },
      })
    })
  }

  createGroup(data: CreateGroupData): Promise<void> {
    return new Promise((resolve, reject) => {
      const groupCallback: ProgressCallback = progress => {
        if (progress.groupId) {
          this.syncActions({
            type: 'patchGroup',
            group: data.reactId,
            content: { ccbId: progress.groupId },
          })
        }
        this.removeProgressListener(data.name, 'group', groupCallback)
        this.removeProgressListener(data.name, 'exists', groupCallback)
      }
      this.addProgressListener(data.name, 'group', groupCallback)
      this.addProgressListener(data.name, 'exists', groupCallback)

      const resolveCallback = () => {
        resolve()
        this.removeProgressListener(data.name, 'completed', resolveCallback)
        this.removeProgressListener(data.name, 'skipped', resolveCallback)
      }
      this.addProgressListener(data.name, 'completed', resolveCallback)
      this.addProgressListener(data.name, 'skipped', resolveCallback)

      const failedCallback: ProgressCallback = ({ message }) => {
        reject(new Error((
          message
            ? `Creating group failed with message ${message}`
            : 'Creating group failed'
        )))
        this.removeProgressListener(data.name, 'failed', failedCallback)
      }
      this.addProgressListener(data.name, 'failed', failedCallback)

      this.send({
        action: 'create',
        data,
      })
    })
  }

  private getProgressKey(name: string, type: ProgressType) {
    return `${type}~~~${name}`
  }

  addProgressListener(name: string, type: ProgressType, callback: ProgressCallback) {
    const key = this.getProgressKey(name, type)
    if (!this.progressListeners[key]) {
      this.progressListeners[key] = []
    }
    this.progressListeners[key].push(callback)
  }

  removeProgressListener(name: string, type: ProgressType, callback: ProgressCallback) {
    const key = this.getProgressKey(name, type)
    if (!this.progressListeners[key]) {
      return
    }
    this.progressListeners[key] = this.progressListeners[key].filter(
      c => c !== callback,
    )
  }

  close() {
    this.sendCheckState.clear()
    this.requestCarpls.clear()
    this.socket.close()
    this.store.dispatch(setSync(''))
  }
}

export default SyncManager
