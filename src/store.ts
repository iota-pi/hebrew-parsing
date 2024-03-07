import { configureStore } from '@reduxjs/toolkit'
import { type TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux'
import ui from './state/ui'

export function setupStore() {
  return configureStore({
    middleware: getDefaultMiddleware => (
      getDefaultMiddleware({
        thunk: false,
        serializableCheck: false,
      })
    ),
    reducer: {
      ui,
    },
  })
}

const store = setupStore()

export default store

export type RootState = ReturnType<typeof store.getState>
export type AppStore = ReturnType<typeof setupStore>
export type AppDispatch = typeof store.dispatch
export const useAppDispatch = () => useDispatch<AppDispatch>()
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector
