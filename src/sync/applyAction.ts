import type {
  ArrayContext,
  BGFAction,
  BGFActionType,
  BGFActionMapping,
  BGFGroupAction,
} from './bgfActions'
import { NOT_IN_A_GROUP_ID } from '../constants'
import type { SyncState } from '../../lambda/types'
import { getRandomId } from '../util'

let applyActionsSettings = {
  suppressErrors: true,
  bias: 'start' as 'start' | 'end',
}

export function configureApplyActions(
  settings: Partial<typeof applyActionsSettings>,
) {
  applyActionsSettings = {
    ...applyActionsSettings,
    ...settings,
  }
}

type ApplyActionHandler<T> = (state: SyncState, action: T) => SyncState
const actionHandlers: {
  [key in BGFActionType]: ApplyActionHandler<BGFActionMapping[key]>
} = {
  addMember: (state, action) => {
    const groups = state.groups
    const target = groups[action.group]
    const index = resolveContext({
      context: action.context,
      array: target.members,
    })
    return {
      ...state,
      groups: {
        ...groups,
        [action.group]: {
          ...target,
          members: [
            ...target.members.slice(0, index),
            action.member,
            ...target.members.slice(index),
          ],
        },
      },
    }
  },
  addGroup: (state, action) => ({
    ...state,
    groups: {
      ...state.groups,
      [action.group.id]: action.group,
    },
  }),
  addIfMissing: (state, action) => {
    const groups = state.groups
    const allMembers = Object.values(groups).flatMap(g => g.members)
    const uniqueMemberIds = new Set(allMembers)
    if (uniqueMemberIds.has(action.member)) {
      return state
    }
    return actionHandlers.addMember(state, { ...action, type: 'addMember' })
  },
  clearGroup: (state, action) => ({
    ...state,
    groups: {
      ...state.groups,
      [action.group]: {
        ...state.groups[action.group],
        members: [],
      },
      [NOT_IN_A_GROUP_ID]: {
        ...state.groups[NOT_IN_A_GROUP_ID],
        members: [
          ...state.groups[NOT_IN_A_GROUP_ID].members,
          ...state.groups[action.group].members,
        ],
      },
    },
  }),
  clearCCBId: (state, action) => {
    const group = Object.values(state.groups).find(g => g.ccbId === action.ccbId)
    if (!group) {
      return state
    }
    return {
      ...state,
      groups: {
        ...state.groups,
        [group.id]: {
          ...state.groups[group.id],
          ccbId: 0,
        },
      },
      ccbIds: state.ccbIds.filter(id => id !== action.ccbId),
    }
  },
  moveMember: (state, action) => (
    actionHandlers.addMember(
      actionHandlers.removeMember(
        state,
        { ...action, type: 'removeMember' },
      ),
      { ...action, type: 'addMember' },
    )
  ),
  patchGroup: (state, action) => {
    const groups = state.groups
    const target = groups[action.group]
    return {
      ...state,
      groups: {
        ...groups,
        [action.group]: {
          ...target,
          ...action.content,
        },
      },
      ccbIds: (
        action.content.ccbId
          ? (
            Array.from(
              new Set([
                ...state.ccbIds,
                action.content.ccbId,
              ]),
            ).filter(id => id && id > 0).sort()
          )
          : state.ccbIds
      ),
    }
  },
  removeMember: (state, action) => {
    const groups = state.groups
    const target = Object.values(groups).find(
      g => g.members.includes(action.member)
    )
    if (!target) {
      return state
    }
    return {
      ...state,
      groups: {
        ...groups,
        [target.id]: {
          ...target,
          members: target.members.filter(m => m !== action.member),
        },
      },
    }
  },
  removeGroup: (state, action) => {
    const { [action.group]: _, ...rest } = state.groups
    return {
      ...state,
      groups: rest,
    }
  },
  setGroups: (state, action) => ({
    ...state,
    groups: action.groups,
  }),
  sortGroup: (state, action) => {
    const groups = state.groups
    const target = groups[action.group]
    const orderedMembers = target.members.slice().sort((a, b) => {
      const indexA = action.order.indexOf(a)
      const indexB = action.order.indexOf(b)
      if (indexA === -1 || indexB === -1) {
        return 0
      }
      return indexA - indexB
    })
    return {
      ...state,
      groups: {
        ...groups,
        [action.group]: {
          ...target,
          members: orderedMembers,
        },
      },
    }
  },
  addCustom: (state, action) => {
    const index = resolveContext({
      context: action.context,
      array: state.customPeople.map(p => p.responseId),
    })
    return {
      ...state,
      customPeople: [
        ...state.customPeople.slice(0, index),
        action.person,
        ...state.customPeople.slice(index),
      ],
    }
  },
  duplicateCustom: (state, action) => {
    const person = state.customPeople.find(p => p.responseId === action.person)
    if (!person) {
      return state
    }
    return {
      ...state,
      customPeople: [
        ...state.customPeople,
        { ...person, responseId: getRandomId() },
      ],
    }
  },
  updateCustom: (state, action) => ({
    ...state,
    customPeople: state.customPeople.map(p => {
      if (p.responseId !== action.person) {
        return p
      }
      return {
        ...p,
        ...action.content,
      }
    }),
  }),
  removeCustom: (state, action) => ({
    ...state,
    customPeople: state.customPeople.filter(p => p.responseId !== action.person),
  }),
  editPerson: (state, action) => ({
    ...state,
    edits: {
      ...state.edits,
      [action.person]: {
        ...state.edits[action.person],
        ...action.content,
      },
    },
  }),
  resetPerson: (state, action) => {
    const { [action.person]: _, ...rest } = state.edits
    return {
      ...state,
      edits: rest,
    }
  },
  setGroupType: (state, action) => ({
    ...state,
    groupType: action.value,
  }),
  addFaculty: (state, action) => ({
    ...state,
    faculties: [
      ...state.faculties.filter(f => f !== action.faculty),
      action.faculty,
    ].sort(),
  }),
  removeFaculty: (state, action) => ({
    ...state,
    faculties: state.faculties.filter(f => f !== action.faculty),
  }),
  clearFaculties: state => ({
    ...state,
    faculties: [],
  }),
  addCampus: (state, action) => ({
    ...state,
    campuses: [
      ...state.campuses.filter(c => c !== action.campus),
      action.campus,
    ].sort(),
  }),
  removeCampus: (state, action) => ({
    ...state,
    campuses: state.campuses.filter(c => c !== action.campus),
  }),
  clearCampuses: state => ({
    ...state,
    campuses: [],
  }),
}

export function applyActions(
  state: SyncState,
  actions: BGFAction | BGFAction[],
): SyncState {
  if (Array.isArray(actions)) {
    let workingState = state
    for (const action of actions) {
      const newState = _applySingleAction(workingState, action)
      workingState = safeSanityCheck({
        newState: newState,
        oldState: workingState,
        suppressErrors: true,
      })
    }
    return safeSanityCheck({
      newState: workingState,
      oldState: state,
    })
  }
  const result = _applySingleAction(state, actions)
  return safeSanityCheck({
    newState: result,
    oldState: state,
  })
}

export default applyActions

export function _applySingleAction(state: SyncState, action: BGFAction) {
  const handler = actionHandlers[action.type] as ApplyActionHandler<typeof action>
  const typedAction = action as BGFActionMapping[typeof action.type]
  const result = handler(state, typedAction)
  return result
}

function safeSanityCheck({
  newState,
  oldState,
  suppressErrors,
}: {
  newState: SyncState,
  oldState: SyncState,
  suppressErrors?: boolean,
}) {
  try {
    sanityCheck(newState)
  } catch (error) {
    if (!applyActionsSettings.suppressErrors && !suppressErrors) {
      throw error
    }

    // Instead of throwing an error, just log it and ignore the update
    if (process.env.NODE_ENV !== 'test') {
      console.error(error)
    }
    return oldState
  }
  return newState
}

export function sanityCheck(state: SyncState) {
  const groups = state.groups
  if (Object.keys(groups).length === 0) {
    throw new Error('Deleting all groups should not be possible')
  }

  if (!Object.hasOwn(groups, NOT_IN_A_GROUP_ID)) {
    throw new Error('There should always be a "not in a group" group')
  }

  const allMembers = Object.values(groups).flatMap(g => g.members)
  const uniqueMemberIds = new Set(allMembers)
  if (uniqueMemberIds.size < allMembers.length) {
    throw new Error('Cannot have any duplicate member ids')
  }
}


// Group Actions

export function applyGroupActions(
  groups: SyncState['groups'],
  actions: BGFGroupAction | BGFGroupAction[],
) {
  const state = { groups }
  return applyActions(state as SyncState, actions).groups
}


// Find best place to insert item
// Special value "null" means everything, e.g. "before: null" means insert at the end
export function resolveContext({
  array,
  context,
}: {
  context: ArrayContext<string>,
  array: string[],
}) {
  if (context.after === null) {
    return 0
  }
  if (context.before === null) {
    return array.length
  }

  let bestScore = -1
  let bestIndex = 0
  for (let i = 0; i <= array.length; ++i) {
    const [firstHalf, secondHalf] = [array.slice(0, i), array.slice(i)]
    const score = (
      context.before.filter(m => firstHalf.includes(m)).length
      + context.after.filter(m => secondHalf.includes(m)).length
    )
    if (score > bestScore) {
      bestScore = score
      bestIndex = i
    } else if (score === bestScore && applyActionsSettings.bias === 'end') {
      bestIndex = i
    }
  }
  return bestIndex
}

export function createContext<T>({ array, index, item, contextSize = 2 }: {
  array: T[],
  index: number,
  item: T,
  contextSize?: number,
}): ArrayContext<T> {
  const beforeIncludesItem = array.slice(0, index).includes(item)
  const offset = beforeIncludesItem ? 1 : 0
  const [before, after] = [array.slice(0, index + offset), array.slice(index + offset)]
  return {
    before: before.filter(i => i !== item).slice(-contextSize),
    after: after.filter(i => i !== item).slice(0, contextSize),
  }
}

export function updateActionContext<T extends BGFAction>({ state, action }: {
  state: SyncState,
  action: T,
}): T {
  if (
    action.type !== 'addMember'
    && action.type !== 'addIfMissing'
    && action.type !== 'moveMember'
    && action.type !== 'addCustom'
  ) {
    return action
  }
  const context = action.context

  const array = (
    action.type === 'addCustom'
      ? state.customPeople.map(p => p.responseId)
      : state.groups[action.group].members
  )
  const index = resolveContext({ array, context })
  const item = (
    action.type === 'addCustom'
      ? action.person.responseId
      : action.member
  )
  console.error({ array, context, index, item })
  const updatedContext = createContext({ array, index, item })
  return {
    ...action,
    context: updatedContext,
  }
}
