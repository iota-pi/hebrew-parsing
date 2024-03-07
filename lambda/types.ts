import type { ObjectDelta } from 'jsondiffpatch'
import type { BGFActionWithId } from '../src/sync/bgfActions'
import type { BibleGroups } from '../src/state/groups'
import type { GroupType } from '../src/state/groupType'
import type { CampusName, GroupMember, MemberEdit } from '../src/state/people'

export type SyncState = {
  campuses: CampusName[],
  ccbIds: number[],
  customPeople: GroupMember[],
  edits: Record<string, MemberEdit>,
  faculties: string[],
  groups: BibleGroups,
  groupType: GroupType,
}

export type Projection<T = object> = {
  [K in keyof T]?: Projection<T[K]> | boolean
}
export type StateProjection = Projection<SyncState>
export type StateHashes = {
  [K in keyof SyncState]: K extends 'groups' ? Record<string, string> : string
}
export type StateVersions = (number | Record<string, number>)[]

export type CreateGroupData = {
  campus: string,
  ccbId: number,
  ccbType: string,
  day: string,
  department: string,
  faculty: string,
  groupType: string,
  members: GroupMember[],
  name: string,
  reactId: string,
  refreshCache: boolean,
  time: number,
}

export type RemoveGroupData = {
  groupId: number,
}

export type RegisterRequestBody = {
  action: 'register',
  session: string | null,
  data: string,
}

export type SyncActionRequestBody = {
  action: 'syncAction',
  session: string,
  data: {
    actions: BGFActionWithId[],
  },
}

export type CheckStateRequestBody = {
  action: 'check',
  session: string,
  data: StateHashes,
  checkId: string,
}

export type RequestStateRequestBody = {
  action: 'request',
  session: string,
  data?: undefined,
}

export type CheckPasswordRequestBody = {
  action: 'password',
  session: null,
  data: string,
}

export type CreateGroupRequestBody = {
  action: 'create',
  session: string,
  data: CreateGroupData,
}

export type RemoveGroupRequestBody = {
  action: 'remove',
  session: string,
  data: RemoveGroupData,
}

export type CarplsRequestBody = {
  action: 'carpls',
  session: string,
  data?: undefined,
}


export type DiffResponse = {
  type: 'diff',
  content: ObjectDelta,
  session: string,
  version: StateVersions,
}

export type ActionResponse = {
  type: 'action',
  content: BGFActionWithId[],
  session: string,
  versions: StateVersions,
}

export type RegistrationResponse = {
  type: 'registration-success',
  content: boolean,
  session: string,
}

export type RequestStateResponse = {
  type: 'state',
  content: Partial<SyncState>,
  session: string,
  versions: StateVersions,
  actions?: string[]
  checkId?: string,
}

export type CheckSuccessResponse = {
  type: 'check-success',
  content: boolean,
  session: string,
  checkId: string,
}

export type SyncFailedReason = 'conflict' | 'no-diff' | 'error' | 'max-attempts'
export type SyncFailedResponse = {
  type: 'sync-failed',
  actions: string[],
  content: string,
  reason: SyncFailedReason,
  session: string,
}

export type SyncSuccessResponse = {
  type: 'sync-success',
  actions: string[],
  session: string,
  versions: StateVersions,
}

export type LoginResponse = {
  type: 'login',
  content: boolean,
  session: string,
}

export type CarplsResponse = {
  type: 'carpls',
  content: Record<string, string>,
  session: string,
}

export type ProgressType = (
  'completed'
  | 'event'
  | 'exists'
  | 'failed'
  | 'group'
  | 'leaders'
  | 'member'
  | 'inactivated'
  | 'remove-member'
  | 'skipped'
  | 'started'
  | 'warning'
)
export type ProgressData = {
  type: ProgressType,
  id: string,
  message?: string,
  groupId?: number,
}
export type ProgressCallback = (data: ProgressData) => void

export type ProgressResponse = {
  type: 'progress',
  content: ProgressData,
  session: string,
}

export type RequestBody = (
  | CarplsRequestBody
  | CreateGroupRequestBody
  | CheckPasswordRequestBody
  | RegisterRequestBody
  | RemoveGroupRequestBody
  | RequestStateRequestBody
  | SyncActionRequestBody
  | CheckStateRequestBody
)
export type StandardRequestWithoutSession = (
  | Omit<CarplsRequestBody, 'session'>
  | Omit<CreateGroupRequestBody, 'session'>
  | Omit<RegisterRequestBody, 'session'>
  | Omit<RemoveGroupRequestBody, 'session'>
  | Omit<RequestStateRequestBody, 'session'>
  | Omit<SyncActionRequestBody, 'session'>
  | Omit<CheckStateRequestBody, 'session'>
)
export type ResponseBody = (
  | CarplsResponse
  | CheckSuccessResponse
  | LoginResponse
  | ActionResponse
  | ProgressResponse
  | RegistrationResponse
  | RequestStateResponse
  | SyncFailedResponse
  | SyncSuccessResponse
)
