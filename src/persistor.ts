import { Unsubscribe } from 'redux'
import { GroupMember, setPeople } from './state/people'
import { setPassword, setSync } from './state/ui'
import store from './store'
import { ONE_WEEK } from './util'

export interface PersistStateItem<T> {
  value: T,
  ttl?: number,
}

export interface PersistState {
  sync: PersistStateItem<string>,
  people: PersistStateItem<GroupMember[]>,
  password: PersistStateItem<string>,
}
const ALL_KEYS_OBJECT: Record<keyof PersistState, true> = {
  sync: true,
  people: true,
  password: true,
}
const ALL_KEYS = Object.keys(ALL_KEYS_OBJECT) as (keyof PersistState)[]

export type RestoreHandlers = {
  [K in keyof PersistState]: (value: PersistState[K]) => void;
}

export const getPersistKey = (key: string) => `__persist-${key}`

class PersistManager {
  private loaded: boolean
  private persistedState: PersistState | null
  private unsubscribe: Unsubscribe

  constructor() {
    this.loaded = false
    this.persistedState = null
    this.unsubscribe = store.subscribe(this.listener.bind(this))
  }

  private getTTL() {
    return Date.now() + ONE_WEEK
  }

  private getStateToPersist(): PersistState {
    const state = store.getState()
    const ttl = this.getTTL()
    return {
      people: {
        value: state.people.people,
        ttl,
      },
      sync: {
        value: state.ui.syncSession,
        ttl,
      },
      password: {
        value: state.ui.apiPassword,
        ttl,
      },
    }
  }

  private listener() {
    if (!this.loaded) {
      return
    }
    const stateToPersist = this.getStateToPersist()
    this.persist(stateToPersist)
    if (!this.persistedState) {
      this.persistedState = stateToPersist
    }
  }

  private persist(state: Partial<PersistState>) {
    for (const key of Object.keys(state) as (keyof PersistState)[]) {
      const persistKey = getPersistKey(key)
      const oldValue = this.persistedState ? this.persistedState[key].value : undefined
      const newState = state[key]
      if (newState && newState.value !== oldValue) {
        localStorage.setItem(persistKey, JSON.stringify(newState))
      }
    }
  }

  load() {
    const handlers: RestoreHandlers = {
      people: people => store.dispatch(setPeople(people.value)),
      sync: sync => store.dispatch(setSync(sync.value)),
      password: password => store.dispatch(setPassword(password.value)),
    }

    for (const key of ALL_KEYS) {
      const persistKey = getPersistKey(key)
      const persistedJSON = localStorage.getItem(persistKey)
      const persisted = persistedJSON ? JSON.parse(persistedJSON) : null
      if (persisted && persisted.ttl && persisted.ttl >= Date.now()) {
        handlers[key](persisted)
      }
    }

    this.loaded = true
  }

  stop() {
    this.unsubscribe()
  }
}

const persistor = new PersistManager()
export default persistor

if (import.meta.hot) {
  // In development, clean up socket before hot reloading
  if (import.meta.hot.data.prevPersistor) {
    import.meta.hot.data.prevPersistor.stop()
  }
  import.meta.hot.data.prevPersistor = persistor
}
