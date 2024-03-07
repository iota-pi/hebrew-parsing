import type { GroupType } from '../state/groupType'
import type { BibleGroup, BibleGroups } from '../state/groups'
import type { CampusName, GroupMember, MemberEdit } from '../state/people'

export type ArrayContext<T> = {
  before: T[] | null,
  after: T[] | null,
}

export type AddMemberAction = {
  type: 'addMember',
  member: string,
  group: string,
  context: ArrayContext<string>,
}
export type AddMemberIfMissingAction = {
  type: 'addIfMissing',
  member: string,
  group: string,
  context: ArrayContext<string>,
}
export type MoveMemberAction = {
  type: 'moveMember',
  member: string,
  group: string,
  context: ArrayContext<string>,
}
export type RemoveMemberAction = {
  type: 'removeMember',
  member: string,
}
export type AddGroupAction = {
  type: 'addGroup',
  group: BibleGroup,
}
export type RemoveGroupAction = {
  type: 'removeGroup',
  group: string,
}
export type SetAction = {
  type: 'setGroups',
  groups: BibleGroups,
}
export type SortMembersAction = {
  type: 'sortGroup',
  group: string,
  order: string[],
}
export type PatchGroupAction = {
  type: 'patchGroup',
  group: string,
  content: Partial<Omit<BibleGroup, 'id' | 'members'>>,
}
export type ClearGroupAction = {
  type: 'clearGroup',
  group: string,
}
export type ClearCCBIdAction = {
  type: 'clearCCBId',
  ccbId: number,
}

export type AddCustomPersonAction = {
  type: 'addCustom',
  person: GroupMember,
  context: ArrayContext<string>,
}
export type DuplicateCustomPersonAction = {
  type: 'duplicateCustom',
  person: string,
}
export type UpdateCustomPersonAction = {
  type: 'updateCustom',
  person: string,
  content: Partial<Pick<GroupMember, 'ccbId' | 'firstName' | 'lastName' | 'leader' | 'gender'>>,
}
export type RemoveCustomPersonAction = {
  type: 'removeCustom',
  person: string,
}
export type EditPersonAction = {
  type: 'editPerson',
  person: string,
  content: Partial<MemberEdit>,
}
export type ResetPersonAction = {
  type: 'resetPerson',
  person: string,
}

export type SetGroupTypeAction = {
  type: 'setGroupType',
  value: GroupType,
}

export type AddFacultyAction = {
  type: 'addFaculty',
  faculty: string,
}
export type RemoveFacultyAction = {
  type: 'removeFaculty',
  faculty: string,
}
export type ClearFacultiesAction = {
  type: 'clearFaculties',
}

export type AddCampusAction = {
  type: 'addCampus',
  campus: CampusName,
}
export type RemoveCampusAction = {
  type: 'removeCampus',
  campus: CampusName,
}
export type ClearCampusAction = {
  type: 'clearCampuses',
}

export type BGFGroupActionMapping = {
  addMember: AddMemberAction,
  addGroup: AddGroupAction,
  addIfMissing: AddMemberIfMissingAction,
  clearGroup: ClearGroupAction,
  clearCCBId: ClearCCBIdAction,
  moveMember: MoveMemberAction,
  patchGroup: PatchGroupAction,
  removeMember: RemoveMemberAction,
  removeGroup: RemoveGroupAction,
  setGroups: SetAction,
  sortGroup: SortMembersAction,
}

export type BGFPeopleActionMapping = {
  addCustom: AddCustomPersonAction,
  duplicateCustom: DuplicateCustomPersonAction,
  updateCustom: UpdateCustomPersonAction,
  removeCustom: RemoveCustomPersonAction,
  editPerson: EditPersonAction,
  resetPerson: ResetPersonAction,
}

export type BGFFacultyActionMapping = {
  addFaculty: AddFacultyAction,
  removeFaculty: RemoveFacultyAction,
  clearFaculties: ClearFacultiesAction,
}

export type BGFCampusActionMapping = {
  addCampus: AddCampusAction,
  removeCampus: RemoveCampusAction,
  clearCampuses: ClearCampusAction,
}

export type BGFActionMapping = (
  BGFGroupActionMapping
  & BGFPeopleActionMapping
  & BGFFacultyActionMapping
  & BGFCampusActionMapping
  & {
    setGroupType: SetGroupTypeAction,
  }
)

export type BGFAction = BGFActionMapping[keyof BGFActionMapping]
export type BGFActionWithId = BGFAction & { id: string }
export type BGFActionType = BGFAction['type']
export type BGFGroupAction = BGFGroupActionMapping[keyof BGFGroupActionMapping]

export function addActionIds(actions: BGFAction[]): BGFActionWithId[] {
  return actions.map(action => ({
    ...action,
    id: Math.random().toString(36).slice(2),
  }))
}
