import type { Unsubscribe } from 'redux'
import { NOT_IN_A_GROUP_ID } from '../constants'
import { filterPeople, mergePeopleData } from './selectors'
import store, { type AppStore } from '../store'
import { BGFAction } from '../sync/bgfActions'
import sync from '../sync/sync'
import { createContext } from '../sync/applyAction'

class MemberMonitor {
  private prevFaculties: string[]
  private unsubscribe: Unsubscribe
  private store: AppStore
  private hasLoaded: boolean

  constructor(customStore?: AppStore) {
    this.hasLoaded = false
    this.prevFaculties = []
    this.store = customStore || store
    this.unsubscribe = this.store.subscribe(this.listener.bind(this))
  }

  private listener() {
    const state = this.store.getState()
    this.hasLoaded = this.hasLoaded || state.faculties.length > 0
    const facultiesHaveChanged = this.checkFacultiesChanged()
    if (this.hasLoaded) {
      this.ensurePeopleInAGroup()
      if (facultiesHaveChanged) {
        this.reFilterPeople()
      }
    }
  }

  private ensurePeopleInAGroup() {
    const state = this.store.getState()
    const groups = Object.values(state.groups.groups)
    const filteredPeople = this.getFilteredPeople()
    const inGroups = new Set(groups.flatMap(g => g.members))
    const notInGroup = filteredPeople.filter(p => !inGroups.has(p.responseId))
    if (notInGroup.length > 0) {
      const existingMembers = state.groups.groups[NOT_IN_A_GROUP_ID].members
      const actions: BGFAction[] = notInGroup.map((person, i): BGFAction => ({
        type: 'addIfMissing',
        member: person.responseId,
        group: NOT_IN_A_GROUP_ID,
        context: createContext({
          array: [...existingMembers, ...notInGroup.map(p => p.responseId)],
          index: existingMembers.length + i,
          item: person.responseId,
        }),
      }))
      sync.syncActions(actions)
    }
  }

  private checkFacultiesChanged() {
    const state = this.store.getState()
    const faculties = state.faculties
    if (this.prevFaculties !== faculties) {
      this.prevFaculties = faculties
      return true
    }
    return false
  }

  private reFilterPeople() {
    const state = this.store.getState()
    const filteredPeople = new Set(this.getFilteredPeople().map(m => m.responseId))
    const groups = Object.values(state.groups.groups)
    const members = groups.flatMap(g => g.members)
    const membersToRemove = members.filter(m => !filteredPeople.has(m))
    if (membersToRemove.length > 0) {
      const actions: BGFAction[] = membersToRemove.map(m => ({
        type: 'removeMember',
        member: m,
      }))
      sync.syncActions(actions)
    }
  }

  private getFilteredPeople() {
    const state = this.store.getState()
    const { people, edits, customPeople } = state.people
    const allPeople = mergePeopleData({
      applyEdits: true,
      customPeople,
      edits,
      people,
    })
    const faculties = state.faculties
    const groupType = state.groupType
    const filteredPeople = filterPeople(allPeople, faculties, groupType)
    return filteredPeople
  }

  close() {
    this.unsubscribe()
  }
}

export default MemberMonitor
