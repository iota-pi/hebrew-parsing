import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { GroupTime } from './people'

export const initialState = {
  message: {
    message: '',
    error: false,
  },
  syncSession: '',
  highlightTime: null as GroupTime | null,
  apiPassword: '',
}

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setMessage: (
      state,
      action: PayloadAction<typeof initialState.message>,
    ) => ({
      ...state,
      message: action.payload,
    }),
    clearMessage: state => ({
      ...state,
      message: { ...initialState.message },
    }),
    setSync: (
      state,
      action: PayloadAction<typeof initialState.syncSession>,
    ) => ({
      ...state,
      syncSession: action.payload,
    }),
    setHighlightTime: (
      state,
      action: PayloadAction<typeof initialState.highlightTime>,
    ) => ({
      ...state,
      highlightTime: action.payload,
    }),
    setPassword: (
      state,
      action: PayloadAction<typeof initialState.apiPassword>,
    ) => ({
      ...state,
      apiPassword: action.payload,
    }),
  },
})

export const {
  setMessage,
  clearMessage,
  setSync,
  setHighlightTime,
  setPassword,
} = uiSlice.actions

export default uiSlice.reducer
