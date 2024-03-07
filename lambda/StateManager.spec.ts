import type { ObjectDelta } from 'jsondiffpatch'
import { StateManager } from './StateManager'
import { getSessionId } from './util'
import patcher from '../src/jsonUtil'
import { SyncState } from './types'
import { NOT_IN_A_GROUP_ID } from '../src/constants'
import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb'

describe('StateManager', () => {
  it('can create a session', async () => {
    const session = getSessionId(10)
    const state = await StateManager.create({ session })
    expect(state.session).toEqual(session)
  })

  it('can load an existing session', async () => {
    const session = getSessionId(10)
    const state1 = await StateManager.create({
      session,
      state: {
        campuses: ['art & design', 'main'],
      },
    })
    const state2 = await StateManager.load(session)
    expect(state1.state.campuses).toEqual(state2.state.campuses)
  })

  it('should apply diff correctly', async () => {
    const session = getSessionId(10)
    const state = await StateManager.create({ session })
    const originalState = state.state
    const originalVersion = state.versions.campuses
    const newState: SyncState = { ...originalState, campuses: ['art & design'] }
    const diff = patcher.diff(originalState, newState)!
    await state.applyDiff(diff as ObjectDelta)

    const state2 = await StateManager.load(session)
    expect(state2.state.campuses).toEqual(['art & design'])
    expect(state2.versions.campuses).toBeGreaterThan(originalVersion)
  })

  it('cannot apply overlapping diffs in parallel', async () => {
    const session = getSessionId(10)
    const state = await StateManager.create({ session })
    const initialState = { ...state.state }
    const initialVersions = { ...state.versions }
    const newState1: SyncState = { ...initialState, campuses: ['art & design'] }
    const newState2: SyncState = { ...initialState, campuses: ['online'] }
    const diff1 = patcher.diff(initialState, newState1)!
    const diff2 = patcher.diff(initialState, newState2)!

    await expect(
      Promise.all([
        state.applyDiff(diff1 as ObjectDelta),
        state.applyDiff(diff2 as ObjectDelta),
      ]),
    ).rejects.toThrow()

    const result = await StateManager.load(session)
    expect(result.state.campuses).not.toEqual(initialState.campuses)
    expect(result.versions.campuses).toBeGreaterThan(initialVersions.campuses)
  })

  it('can apply non-overlapping diffs in parallel', async () => {
    const session = getSessionId(10)
    const state = await StateManager.create({ session })
    const newState1: SyncState = { ...state.state, campuses: ['art & design'] }
    const newState2: SyncState = { ...state.state, ccbIds: [1, 2, 3] }
    const diff1 = patcher.diff(state.state, newState1)!
    const diff2 = patcher.diff(state.state, newState2)!
    await Promise.all([
      state.applyDiff(diff1 as ObjectDelta),
      state.applyDiff(diff2 as ObjectDelta),
    ])

    const result = await StateManager.load(session)
    expect(result.state.campuses).toEqual(['art & design'])
    expect(result.state.ccbIds).toEqual([1, 2, 3])
  })

  it('can patch different groups in parallel', async () => {
    const session = getSessionId(10)
    const state = await StateManager.create({ session })
    await state.applyDiff(
      patcher.diff(
        state.state,
        { ...state.state, groups: { ...state.state.groups, abc: {} } },
      )! as ObjectDelta,
    )

    const state1 = await StateManager.load(session)
    const state2 = await StateManager.load(session)

    const diff1 = patcher.diff(
      state1.state,
      {
        ...state1.state,
        groups: { ...state1.state.groups, abc: { members: ['456'] } },
      },
    )! as ObjectDelta
    const diff2 = patcher.diff(
      state1.state,
      {
        ...state1.state,
        groups: {
          ...state1.state.groups,
          [NOT_IN_A_GROUP_ID]: {
            ...state1.state.groups[NOT_IN_A_GROUP_ID],
            members: ['123'],
          },
        },
      },
    )! as ObjectDelta

    const p1 = state1.applyDiff(diff1)
    const p2 = state2.applyDiff(diff2)
    await Promise.all([p1, p2])

    const result = await StateManager.load(session)
    expect(result.state.groups['abc'].members).toEqual(['456'])
    expect(result.state.groups[NOT_IN_A_GROUP_ID].members).toEqual(['123'])
  })

  it('cannot apply actions to overlapping groups in parallel', async () => {
    const session = getSessionId(10)
    const state = await StateManager.create({ session })
    await state.applyDiff(
      patcher.diff(
        state.state,
        { ...state.state, groups: { ...state.state.groups, abc: {} } },
      )! as ObjectDelta,
    )

    const state1 = await StateManager.load(session)
    const state2 = await StateManager.load(session)

    const diff1 = patcher.diff(
      state1.state,
      {
        ...state1.state,
        groups: { ...state1.state.groups, abc: { members: ['456'] } },
      },
    )! as ObjectDelta
    const diff2 = patcher.diff(
      state1.state,
      {
        ...state1.state,
        groups: { ...state1.state.groups, abc: { ccbId: 0 } },
      },
    )! as ObjectDelta

    const p1 = state1.applyDiff(diff1)
    const p2 = state2.applyDiff(diff2)
    await expect(Promise.all([p1, p2])).rejects.toThrow(ConditionalCheckFailedException)
  })

  it('creates version array from projection', async () => {
    const session = getSessionId(10)
    const state = await StateManager.create({ session })
    state.versions = {
      campuses: 1,
      ccbIds: 2,
      customPeople: 3,
      edits: 4,
      faculties: 5,
      groups: {
        [NOT_IN_A_GROUP_ID]: 6,
        foo: 123,
        bar: 234,
      },
      groupType: 7,
    }
    expect(state.getVersions()).toEqual(
      [1,2,3,4,5,{[NOT_IN_A_GROUP_ID]:6,foo:123,bar:234},7],
    )
    expect(
      state.getVersions({ ccbIds: true, groups: { foo: true, bar: true } })
    ).toEqual(
      [0,2,0,0,0,{foo:123,bar:234},0],
    )
  })
})
