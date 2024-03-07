import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { resetAll } from './actions'
import type { CampusName } from './people'
import { ensureUniqueCampuses } from './util'

export const initialState: CampusName[] = []

const campusesSlice = createSlice({
  name: 'campuses',
  initialState,
  reducers: {
    set: (state, action: PayloadAction<(CampusName | '' | undefined)[]>) => (
      ensureUniqueCampuses(
        action.payload.filter((c): c is Exclude<typeof c, '' | undefined> => !!c),
      )
    ),
  },
  extraReducers: builder => {
    builder
      .addCase(resetAll, () => initialState.slice())
  },
})

export const {
  set: setCampuses,
} = campusesSlice.actions

export default campusesSlice.reducer
