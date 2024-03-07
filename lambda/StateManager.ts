import { GetCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb'
import type { ObjectDelta } from 'jsondiffpatch'
import { ddb } from './ddb'
import type { StateProjection, StateVersions, SyncState } from './types'
import { ONE_MINUTE, ONE_MONTH } from './util'
import patcher from '../src/jsonUtil'
import {
  applyProjection,
  ensureUniqueCampuses,
  ensureUniqueCustomPeople,
  ensureUniqueFaculties,
  NEW_SESSION_STATE,
} from '../src/state/util'
import type { BibleGroups } from '../src/state/groups'
import { NOT_IN_A_GROUP_ID } from '../src/constants'


const TableName = (
  process.env.STATE_TABLE_NAME || `BGFState_${process.env.NODE_ENV}`
)

export interface VersionedState<T> {
  version: T extends BibleGroups ? Record<string, number> : number,
  state: T,
}

export type DBSyncState = {
  [Key in keyof SyncState]: VersionedState<SyncState[Key]>;
}

export type DBFullState = DBSyncState & {
  session: string,
  ccbAPILock: number,
  connectionWithLock: string,
}

export type SyncStateVersions = {
  [Key in keyof DBSyncState]: DBSyncState[Key]['version'];
}

export class StateManager {
  session: string
  state: SyncState
  versions: SyncStateVersions

  constructor({
    state,
    session,
    versions,
  }: {
    state: SyncState,
    session: string,
    versions: SyncStateVersions,
  }) {
    this.state = state
    this.session = session
    this.versions = versions
  }

  static async create({
    state,
    session,
  }: {
    state?: Partial<SyncState>,
    session: string,
  }) {
    const instance = new StateManager({
      state: { ...NEW_SESSION_STATE, ...state },
      session,
      versions: {
        campuses: 0,
        ccbIds: 0,
        customPeople: 0,
        edits: 0,
        faculties: 0,
        groups: {
          [NOT_IN_A_GROUP_ID]: 0,
        },
        groupType: 0,
      },
    })
    await instance.save()
    return instance
  }

  private static loadFromFullState(
    session: string,
    state: DBFullState,
  ) {
    return new StateManager({
      state: {
        campuses: state.campuses.state,
        ccbIds: state.ccbIds.state,
        customPeople: state.customPeople.state,
        edits: state.edits.state,
        faculties: state.faculties.state,
        groups: state.groups.state,
        groupType: state.groupType.state,
      },
      session,
      versions: {
        campuses: state.campuses.version,
        ccbIds: state.ccbIds.version,
        customPeople: state.customPeople.version,
        edits: state.edits.version,
        faculties: state.faculties.version,
        groups: state.groups.version,
        groupType: state.groupType.version,
      },
    })
  }

  static async load(session: string): Promise<StateManager> {
    const result = await ddb.send(new GetCommand({
      TableName,
      Key: { session },
    }))
    if (result.Item) {
      const item = result.Item as DBFullState
      return this.loadFromFullState(session, item)
    }
    throw new Error(`Could not find state for session ${session}`)
  }

  private sanitiseState(state: SyncState): SyncState {
    return {
      ...state,
      campuses: ensureUniqueCampuses(state.campuses),
      customPeople: ensureUniqueCustomPeople(state.customPeople),
      faculties: ensureUniqueFaculties(state.faculties),
    }
  }

  async applyDiff(diff: ObjectDelta, preUpdatedState?: Partial<SyncState>) {
    if (!diff) {
      return
    }

    let patchedState: typeof this.state = patcher.clone(this.state)
    if (preUpdatedState) {
      patchedState = { ...patchedState, ...preUpdatedState }
    } else {
      patcher.patch(patchedState, diff)
    }
    const newState = this.sanitiseState(patchedState)

    const updatedFields = Array.from(Object.keys(diff)) as (keyof SyncState)[]
    const updatedGroups = Object.keys(diff.groups ?? {})
    const ttl = Date.now() + ONE_MONTH

    const updateExpressionFields = updatedFields.flatMap(
      field => {
        if (field !== 'groups') {
          return [
            `#${field}.#state = :${field}`,
            `#${field}.version = :${field}Version + :inc`,
          ]
        }

        return updatedGroups.flatMap((_, index) => [
          `#groups.#state.#groups${index} = :groups${index}`,
          `#groups.version.#groups${index} = :groups${index}Version + :inc`,
        ])
      },
    )
    const UpdateExpression = `SET ${updateExpressionFields.join(', ')}, #ttl = :ttl`
    const ConditionExpression = updatedFields.flatMap(field => {
      if (field !== 'groups') {
        return `#${field}.version = :${field}Version`
      }
      return updatedGroups.map((_, index) => (
        '('
        + `attribute_not_exists(#groups.version.#groups${index})`
        + ' OR '
        + `#groups.version.#groups${index} = :groups${index}Version`
        + ')'
      ))
    }).join(' AND ')
    const ExpressionAttributeNames = Object.fromEntries(
      [
        ...updatedFields.map(field => [`#${field}`, field as string]),
        ...updatedGroups.map((group, index) => [`#groups${index}`, group as string]),
        ['#ttl', 'ttl'],
      ],
    )
    ExpressionAttributeNames['#state'] = 'state'
    const ExpressionAttributeValues = Object.fromEntries(
      [
        ...(
          updatedFields
            .filter(f => f !== 'groups')
            .flatMap(field => [
              [`:${field}`, newState[field]],
              [`:${field}Version`, this.versions[field]],
            ])
        ),
        ...(
          updatedFields.includes('groups')
            ? updatedGroups.flatMap((g, index) => [
              [`:groups${index}`, newState.groups[g]],
              [`:groups${index}Version`, this.versions.groups[g] || 0],
            ])
            : []
        ),
        [':ttl', ttl],
        [':inc', 1],
      ],
    )

    await ddb.send(new UpdateCommand({
      TableName,
      Key: { session: this.session },
      ConditionExpression,
      ExpressionAttributeNames,
      ExpressionAttributeValues,
      UpdateExpression,
    }))

    this.state = newState
    for (const field of updatedFields) {
      if (field === 'groups') {
        for (const key of updatedGroups) {
          this.versions.groups[key] = (this.versions.groups[key] ?? 0) + 1
        }
      } else {
        this.versions[field] += 1
      }
    }
  }

  get dbState(): DBSyncState {
    return {
      campuses: {
        state: this.state.campuses,
        version: this.versions.campuses,
      },
      ccbIds: {
        state: this.state.ccbIds,
        version: this.versions.ccbIds,
      },
      customPeople: {
        state: this.state.customPeople,
        version: this.versions.customPeople,
      },
      edits: {
        state: this.state.edits,
        version: this.versions.edits,
      },
      faculties: {
        state: this.state.faculties,
        version: this.versions.faculties,
      },
      groups: {
        state: this.state.groups,
        version: this.versions.groups,
      },
      groupType: {
        state: this.state.groupType,
        version: this.versions.groupType,
      },
    }
  }

  getVersions(projection?: StateProjection): StateVersions {
    const versionKeys = (
      Object.keys(this.versions)
        .sort((key1, key2) => key1.localeCompare(key2))
    ) as (keyof SyncStateVersions)[]
    const versionSegment = applyProjection(this.versions, projection)
    const versions = versionKeys.map(
      key => (
        versionSegment[key] || 0
      ),
    )
    return versions
  }

  private async save() {
    await ddb.send(new PutCommand({
      TableName,
      Item: {
        session: this.session,
        ...this.dbState,
        ttl: Date.now() + ONE_MONTH,
      },
      ConditionExpression: 'attribute_not_exists(#session)',
      ExpressionAttributeNames: {
        '#session': 'session',
      },
    }))
  }

  static async acquireOrRenewAPILock(
    session: string,
    connection: string,
  ): Promise<boolean> {
    const now = Date.now()
    try {
      await ddb.send(new UpdateCommand({
        TableName,
        Key: { session },
        UpdateExpression: 'SET ccbAPILock = :lockTime, connectionWithLock = :connection',
        ConditionExpression: [
          'attribute_not_exists(ccbAPILock)',
          'ccbAPILock < :currentTime',
          'connectionWithLock = :connection',
        ].join(' OR '),
        ExpressionAttributeValues: {
          ':lockTime': now + ONE_MINUTE,
          ':currentTime': now,
          ':connection': connection,
        },
      }))
    } catch (error) {
      if (error instanceof ConditionalCheckFailedException) {
        return false
      }
      throw error
    }

    return true
  }

  static async releaseAPILock(session: string, connection: string): Promise<void> {
    try {
      await ddb.send(new UpdateCommand({
        TableName,
        Key: { session },
        UpdateExpression: 'SET ccbAPILock = :zero, connectionWithLock = :empty',
        ConditionExpression: 'connectionWithLock = :connection',
        ExpressionAttributeValues: {
          ':connection': connection,
          ':empty': '',
          ':zero': 0,
        },
      }))
    } catch (error) {
      if (!(error instanceof ConditionalCheckFailedException)) {
        throw error
      }
    }
  }
}
