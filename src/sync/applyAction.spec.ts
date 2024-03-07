import { SyncState } from '../../lambda/types'
import { NOT_IN_A_GROUP_ID } from '../constants'
import type { BibleGroups } from '../state/groups'
import { type GroupTime } from '../state/people'
import { NEW_SESSION_STATE } from '../state/util'
import * as applyAction from './applyAction'
import { AddMemberIfMissingAction, AddMemberAction, ArrayContext, BGFAction } from './bgfActions'

const time: GroupTime = { campus: 'main', day: '', start: 0, time: '' }

function groupsToState(groups: BibleGroups) {
  return { groups } as SyncState
}

describe('applyActions for groups', () => {
  it('can apply a single action', () => {
    const group = { ccbId: 0, id: NOT_IN_A_GROUP_ID, members: [], time }
    const action: BGFAction = {
      type: 'addGroup',
      group,
    }
    const result = applyAction.applyActions(groupsToState({}), action)
    expect(result.groups).toEqual({ [group.id]: group })
  })

  it('can apply a single action in a list', () => {
    const group = { ccbId: 0, id: NOT_IN_A_GROUP_ID, members: [], time }
    const action: BGFAction = {
      type: 'addGroup',
      group,
    }
    const result = applyAction.applyActions(groupsToState({}), [action])
    expect(result.groups).toEqual({ [group.id]: group })
  })

  it('can apply multiple actions in a list', () => {
    const group = { ccbId: 0, id: NOT_IN_A_GROUP_ID, members: [], time }
    const context: ArrayContext<string> = { before: null, after: [] }
    const actions: BGFAction[] = [
      {
        type: 'addGroup',
        group,
      },
      {
        type: 'addMember',
        member: '1',
        context,
        group: NOT_IN_A_GROUP_ID,
      },
      {
        type: 'addMember',
        member: '2',
        context,
        group: NOT_IN_A_GROUP_ID,
      },
    ]
    const result = applyAction.applyActions(groupsToState({}), actions)
    expect(result.groups).toEqual({
      [group.id]: { ...group, members: ['1', '2'] }
    })
  })

  it('sanity check throws based on config', () => {
    expect(() => applyAction.applyActions(groupsToState({}), [])).not.toThrow()
    applyAction.configureApplyActions({ suppressErrors: false })
    expect(() => applyAction.applyActions(groupsToState({}), [])).toThrow()
  })
})

describe('sanityCheck', () => {
  const sanityCheck = applyAction.sanityCheck

  it('throws error with empty groups object', () => {
    expect(() => sanityCheck(groupsToState({}))).toThrow()
  })

  it('throws error for no not-in-a-group group', () => {
    expect(() => sanityCheck(groupsToState({
      '': { ccbId: 0, id: '', members: [], time },
    }))).toThrow()
  })

  it('throws error for duplicate member ids', () => {
    expect(() => sanityCheck(groupsToState({
      foo: { ccbId: 0, id: 'foo', members: ['1', '2', '3'], time },
      bar: { ccbId: 1, id: 'bar', members: ['4', '3', '5'], time },
      [NOT_IN_A_GROUP_ID]: { ccbId: 2, id: NOT_IN_A_GROUP_ID, members: [], time },
    }))).toThrow()
  })

  it('succeeds for valid groups', () => {
    expect(() => sanityCheck(groupsToState({
      foo: { ccbId: 0, id: 'foo', members: ['1', '2', '3'], time },
      bar: { ccbId: 1, id: 'bar', members: ['4', '5', '6'], time },
      [NOT_IN_A_GROUP_ID]: { ccbId: 2, id: NOT_IN_A_GROUP_ID, members: [], time },
    }))).not.toThrow()
  })
})

describe('applyAdd', () => {
  const applyActions = applyAction.applyActions

  it('can append members', () => {
    const groups: BibleGroups = {
      abc: {
        id: 'abc',
        ccbId: 0,
        members: [],
        time,
      },
      [NOT_IN_A_GROUP_ID]: { ccbId: 1, id: NOT_IN_A_GROUP_ID, members: [], time },
    }
    const actions: AddMemberAction[] = [
      {
        type: 'addMember',
        member: '1',
        context: {
          before: [],
          after: [],
        },
        group: 'abc',
      },
      {
        type: 'addMember',
        member: '2',
        context: {
          before: ['1'],
          after: [],
        },
        group: 'abc',
      },
      {
        type: 'addMember',
        member: '3',
        context: {
          before: null,
          after: [],
        },
        group: 'abc',
      },
    ]

    const newState = applyActions(groupsToState(groups), actions)

    expect(newState.groups.abc.members).toEqual(['1', '2', '3'])
  })

  it('can prepend members', () => {
    const groups: BibleGroups = {
      abc: {
        id: 'abc',
        ccbId: 0,
        members: [],
        time,
      },
      [NOT_IN_A_GROUP_ID]: { ccbId: 1, id: NOT_IN_A_GROUP_ID, members: [], time },
    }
    const actions: AddMemberAction[] = [
      {
        type: 'addMember',
        member: '1',
        context: {
          before: [],
          after: [],
        },
        group: 'abc',
      },
      {
        type: 'addMember',
        member: '2',
        context: {
          before: [],
          after: ['1'],
        },
        group: 'abc',
      },
      {
        type: 'addMember',
        member: '3',
        context: {
          before: [],
          after: null,
        },
        group: 'abc',
      },
    ]

    const newState = applyActions(groupsToState(groups), actions)

    expect(newState.groups.abc.members).toEqual(['3', '2', '1'])
  })

  it('can insert in middle', () => {
    const groups: BibleGroups = {
      abc: {
        id: 'abc',
        ccbId: 0,
        members: ['1', '2'],
        time,
      },
      [NOT_IN_A_GROUP_ID]: { ccbId: 1, id: NOT_IN_A_GROUP_ID, members: [], time },
    }
    const actions: AddMemberAction[] = [
      {
        type: 'addMember',
        member: '3',
        context: {
          before: ['1'],
          after: ['2'],
        },
        group: 'abc',
      },
    ]

    const newState = applyActions(groupsToState(groups), actions)

    expect(newState.groups.abc.members).toEqual(['1', '3', '2'])
  })

  it('can insert in middle with gaps', () => {
    const groups: BibleGroups = {
      abc: {
        id: 'abc',
        ccbId: 0,
        members: ['1', '2', '3'],
        time,
      },
      [NOT_IN_A_GROUP_ID]: { ccbId: 1, id: NOT_IN_A_GROUP_ID, members: [], time },
    }
    const actions: AddMemberAction[] = [
      {
        type: 'addMember',
        member: '4',
        context: {
          before: ['1'],
          after: ['3'],
        },
        group: 'abc',
      },
    ]

    const newState = applyActions(groupsToState(groups), actions)

    expect(newState.groups.abc.members[0]).toEqual('1')
    expect(newState.groups.abc.members[3]).toEqual('3')
    expect(newState.groups.abc.members.slice(1, 3).sort()).toEqual(['2', '4'])
  })

  it('can insert with partially missing context', () => {
    const groups: BibleGroups = {
      abc: {
        id: 'abc',
        ccbId: 0,
        members: ['1', '2', '3'],
        time,
      },
      [NOT_IN_A_GROUP_ID]: { ccbId: 1, id: NOT_IN_A_GROUP_ID, members: [], time },
    }
    const actions: AddMemberAction[] = [
      {
        type: 'addMember',
        member: '5',
        context: {
          before: ['2', '4'],
          after: ['3'],
        },
        group: 'abc',
      },
    ]

    const newState = applyActions(groupsToState(groups), actions)

    expect(newState.groups.abc.members).toEqual(['1', '2', '5', '3'])
  })
})

describe('applyAddIfMissing', () => {
  const applyActions = applyAction.applyActions

  it('adds only missing members', () => {
    const groups: BibleGroups = {
      abc: {
        id: 'abc',
        ccbId: 0,
        members: ['2'],
        time,
      },
      [NOT_IN_A_GROUP_ID]: { ccbId: 1, id: NOT_IN_A_GROUP_ID, members: [], time },
    }
    const context: ArrayContext<string> = {
      before: null,
      after: [],
    }
    const actions: AddMemberIfMissingAction[] = [
      {
        type: 'addIfMissing',
        member: '1',
        context,
        group: 'abc',
      },
      {
        type: 'addIfMissing',
        member: '2',
        context,
        group: 'abc',
      },
      {
        type: 'addIfMissing',
        member: '3',
        context,
        group: 'abc',
      },
    ]

    const newState = applyActions(groupsToState(groups), actions)
    expect(newState.groups.abc.members).toEqual(['2', '1', '3'])
  })
})

describe('array contexts', () => {
  it.each([
    [['a', 'd', 'b', 'c', 'e'], { before: [], after: [] }, 0],
    [['a', 'b', 'c', 'd', 'e'], { before: ['c', 'd'], after: ['e'] }, 4],
    [['a', 'd', 'b', 'c', 'e'], { before: ['c', 'd'], after: ['e'] }, 4],
  ])('resolves contexts correctly', (array, context, expected) => {
    expect(applyAction.resolveContext({ array, context })).toEqual(expected)
  })

  it.each([
    [[], 'a', 0, { before: [], after: [] }],
    [['a', 'b', 'c'], 'a', 0, { before: [], after: ['b', 'c'] }],
    [['a', 'b', 'c', 'd', 'e'], 'a', 2, { before: ['b', 'c'], after: ['d', 'e'] }],
  ])('creates context for adding item to array', (array, item, index, expected) => {
    expect(applyAction.createContext({ array, index, item })).toEqual(expected)
  })

  it('new items should be added according to bias', () => {
    const state: SyncState = NEW_SESSION_STATE
    const action1: BGFAction = {
      type: 'addMember',
      group: NOT_IN_A_GROUP_ID,
      member: '1',
      context: { before: [], after: [] },
    }
    const action2: BGFAction = {
      type: 'addMember',
      group: NOT_IN_A_GROUP_ID,
      member: '2',
      context: { before: [], after: [] },
    }

    expect(
      applyAction.applyActions(
        state,
        [action1, action2],
      ).groups[NOT_IN_A_GROUP_ID].members,
    ).toEqual(['2', '1'])

    applyAction.configureApplyActions({ bias: 'end' })
    expect(
      applyAction.applyActions(
        state,
        [action1, action2],
      ).groups[NOT_IN_A_GROUP_ID].members,
    ).toEqual(['1', '2'])
  })
})
