import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { resetAll } from './actions'
import type { GroupTime } from './people'

export type BibleGroup = {
  id: string,
  members: string[],
  time: GroupTime,
  ccbId: number,
}

export type BibleGroups = Record<string, BibleGroup>

export type BaseUpdatePayload = {
  updatedGroups: BibleGroup[],
  finisher?: (allGroups: BibleGroup[]) => BibleGroup[],
}

export const initialState: {
  groups: BibleGroups,
  ccbIds: number[],
} = {
  groups: {},
  ccbIds: [],
}

const groupsSlice = createSlice({
  name: 'groups',
  initialState,
  reducers: {
    setGroups: (state, action: PayloadAction<BibleGroups>) => ({
      ...state,
      groups: action.payload,
    }),
    setCCBIds: (state, action: PayloadAction<number[]>) => ({
      ...state,
      ccbIds: action.payload,
    }),
  },
  extraReducers: builder => {
    builder
      .addCase(resetAll, () => ({ ...initialState }))
  },
})

export const {
  setGroups,
  setCCBIds,
} = groupsSlice.actions

export default groupsSlice.reducer
