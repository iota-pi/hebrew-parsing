import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { resetAll } from './actions'

export type GroupType = 'Bible Study' | 'Prayer Group'
export const GROUP_TYPES: GroupType[] = ['Bible Study', 'Prayer Group']

export const initialState = 'Bible Study' as GroupType

const groupTypeSlice = createSlice({
  name: 'groupType',
  initialState,
  reducers: {
    set: (state, action: PayloadAction<GroupType>) => action.payload,
  },
  extraReducers: builder => {
    builder
      .addCase(resetAll, () => initialState)
  },
})

export const {
  set: setGroupType,
} = groupTypeSlice.actions

export default groupTypeSlice.reducer
