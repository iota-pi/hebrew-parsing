import { createSlice, PayloadAction } from '@reduxjs/toolkit'

const initialState = null as string | null

const editPersonSlice = createSlice({
  name: 'editPerson',
  initialState,
  reducers: {
    set: (state, action: PayloadAction<string | null>) => action.payload,
  },
})

export const { set: setEditPerson } = editPersonSlice.actions

export default editPersonSlice.reducer
