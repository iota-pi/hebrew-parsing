import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { resetAll } from './actions'
import { ensureUniqueCustomPeople } from './util'

export type CampusName = 'main' | 'online' | 'art & design'
export const CAMPUS_MAP: Record<CampusName, string> = {
  main: 'Main',
  online: 'Online',
  'art & design': 'Art & Design',
}
export const ALL_CAMPUSES: CampusName[] = ['main', 'online', 'art & design']
export type Gender = 'm' | 'f' | ''

export type GroupTime = {
  day: string,
  campus: CampusName,
  start: number,
  time: string,
}

export type GroupMember = {
  ccbId: string,
  responseId: string,
  firstName: string,
  lastName: string,
  gender: Gender,
  year: string,
  faculty: string,
  degree: string,
  times: GroupTime[],
  prayerTimes: GroupTime[],
  extraOptions: string[],
  leader: boolean,
  prayerLeader: boolean,
  comments: string,
  previous: GroupMember[],
  custom?: boolean,
  missing?: false,
}

export type MissingGroupMember = {
  responseId: string,
  missing: true,
  leader?: false,
  prayerLeader?: boolean,
}

export type MemberEdit = Pick<GroupMember, 'ccbId'> & Partial<GroupMember>

type PeopleState = {
  customPeople: GroupMember[],
  edits: Record<string, MemberEdit>,
  people: GroupMember[],
  carpls: Record<string, string>,
}
export const initialState = {
  customPeople: [],
  edits: {},
  people: [],
  carpls: {},
} as PeopleState

const peopleSlice = createSlice({
  name: 'people',
  initialState,
  reducers: {
    set: (state, action: PayloadAction<GroupMember[]>): PeopleState => ({
      ...state,
      people: action.payload,
    }),
    setEdits: (state, action: PayloadAction<Record<string, MemberEdit>>): PeopleState => ({
      ...state,
      edits: action.payload,
    }),
    reset: (state, action: PayloadAction<string[]>): PeopleState => ({
      ...state,
      edits: Object.fromEntries(
        Object.entries(state.edits).filter(([id]) => !action.payload.includes(id)),
      ),
    }),
    setCustom: (state, action: PayloadAction<GroupMember[]>): PeopleState => ({
      ...state,
      customPeople: ensureUniqueCustomPeople(action.payload),
    }),
    updateCarpls: (state, action: PayloadAction<Record<string, string>>): PeopleState => ({
      ...state,
      carpls: { ...state.carpls, ...action.payload },
    }),
  },
  extraReducers: builder => {
    builder
      .addCase(resetAll, state => ({ ...initialState, people: state.people } as PeopleState))
  },
})

export const {
  set: setPeople,
  setEdits,
  setCustom: setCustomPeople,
  updateCarpls,
} = peopleSlice.actions

export default peopleSlice.reducer
