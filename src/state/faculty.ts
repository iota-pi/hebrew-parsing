import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { resetAll } from './actions'
import { ensureUniqueFaculties } from './util'

export const initialState: string[] = []

const facultiesSlice = createSlice({
  name: 'faculties',
  initialState,
  reducers: {
    set: (state, action: PayloadAction<(string | '' | undefined)[]>) => (
      ensureUniqueFaculties(
        action.payload.filter((f): f is Exclude<typeof f, '' | undefined> => !!f),
      )
    ),
  },
  extraReducers: builder => {
    builder
      .addCase(resetAll, () => initialState.slice())
  },
})

export const {
  set: setFaculties,
} = facultiesSlice.actions

export default facultiesSlice.reducer
