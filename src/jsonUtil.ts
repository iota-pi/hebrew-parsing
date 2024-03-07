import type {
  ArrayDelta,
  DeletedDelta,
  MovedDelta,
  PatchContext,
} from 'jsondiffpatch'
import { create } from 'jsondiffpatch'
import hashObject from 'object-hash'
import type { GroupMember } from './state/people'
import type { BibleGroup } from './state/groups'

const ARRAY_MOVE = 3

export class ConflictError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ConflictError'
  }
}

function getObjectId(obj: object | null): string {
  if (obj === null) {
    return ''
  }

  if (Object.hasOwn(obj, 'responseId')) {
    return (obj as GroupMember).responseId
  }
  if (Object.hasOwn(obj, 'id') && Object.hasOwn(obj, 'members')) {
    return (obj as BibleGroup).id
  }

  return hashObject(obj)
}

const patcher = create({
  arrays: {
    includeValueOnMove: true,
  },
  cloneDiffValues: true,
  objectHash: getObjectId,
})

function adjustArrayIndex(context: PatchContext) {
  if (!context.delta || (context.delta as ArrayDelta)._t !== 'a') {
    return
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const array = context.left as any[]
  const delta = context.delta as ArrayDelta
  for (const rawIndex of Object.keys(delta)) {
    const index = rawIndex as keyof ArrayDelta
    if (index === '_t' || delta[index] === undefined) {
      continue
    }

    if (typeof index === 'string' && index[0] === '_') {
      const innerDelta = delta[index] as MovedDelta | DeletedDelta
      const numericIndex = parseInt(index.slice(1))
      const oldValue = innerDelta[0]
      let trueIndex: number = numericIndex
      if (typeof oldValue !== 'object') {
        if (array[numericIndex] !== oldValue) {
          trueIndex = array.indexOf(oldValue)
        }
      } else {
        const oldValueHash = getObjectId(oldValue)
        if (getObjectId(array[numericIndex]) !== oldValueHash) {
          trueIndex = array.findIndex(x => getObjectId(x) === oldValueHash)
        }
      }
      if (trueIndex !== -1) {
        if (trueIndex !== numericIndex) {
          if (innerDelta[2] === ARRAY_MOVE) {
            const newIndex = innerDelta[1]
            const adjustedIndex = newIndex + (trueIndex - numericIndex)
            const correctedAdjustedIndex = Math.max(adjustedIndex, 0)
            innerDelta[1] = correctedAdjustedIndex
          }

          delta[`_${trueIndex}`] = innerDelta
          delete delta[index]
        }
      } else {
        // Can't find matching item
        delete delta[index]
      }
    }
  }
}
adjustArrayIndex.filterName = 'arrayIndexTweak'
patcher.processor.pipes.patch.before('arrays', adjustArrayIndex)

function throwErrorOnConflictingUpdate(context: PatchContext) {
  const delta = context.delta
  if (
    !delta
    || !Array.isArray(delta)
    || delta.length !== 2
  ) {
    return
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const left = context.left as any
  let conflict = false
  if (
    typeof left === 'object'
    && typeof delta[0] === 'object'
    && typeof delta[1] === 'object'
  ) {
    const leftHash = getObjectId(left)
    if (
      leftHash !== getObjectId(delta[0])
      && leftHash !== getObjectId(delta[1])
    ) {
      conflict = true
    }
  } else {
    if (left !== delta[0] && left !== delta[1]) {
      conflict = true
    }
  }
  if (conflict) {
    throw new ConflictError(
      `Conflict occurred. Modification condition not met. ${left} !== ${delta[0]}`,
    )
  }
}
throwErrorOnConflictingUpdate.filterName = 'conflictingUpdate'
patcher.processor.pipes.patch.before('trivial', throwErrorOnConflictingUpdate)

function ignoreArrayDuplicates(context: PatchContext) {
  if (!context.delta || (context.delta as ArrayDelta)._t !== 'a') {
    return
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const array = context.left as any[]
  const delta = context.delta as ArrayDelta
  for (const rawIndex of Object.keys(delta)) {
    const index = rawIndex as keyof ArrayDelta
    if (index === '_t' || delta[index] === undefined) {
      continue
    }

    if (typeof index === 'string' && index[0] !== '_') {
      const innerDelta = delta[index]
      if (!innerDelta || !Array.isArray(innerDelta) || innerDelta.length === 3) {
        continue
      }
      const value = innerDelta[innerDelta.length - 1]
      if (typeof value === 'object') {
        if (array.map(getObjectId).includes(getObjectId(value))) {
          delete delta[index]
        }
      } else {
        if (array.includes(value)) {
          delete delta[index]
        }
      }
    }
  }
}
ignoreArrayDuplicates.filterName = 'ignoreArrayDuplicates'
patcher.processor.pipes.patch.before('arrays', ignoreArrayDuplicates)

export default patcher
