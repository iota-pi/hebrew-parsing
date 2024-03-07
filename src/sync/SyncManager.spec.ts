import SyncManager from './SyncManager'

describe('SyncManager', () => {
  it.each([
    [[1,0,0], [1,0,0], false],
    [[2,0,0], [1,0,0], true],
    [[1,1,0], [1,0,0], true],
    [[1,0,1], [1,0,0], true],
    [[1,0,1], [1,0,1], false],
    [[0,0,2], [1,0,1], true],
    [[0,0,1], [1,0,1], false],
    // With object versions
    [[0,{}], [1,{}], false],
    [[1,{}], [1,{}], false],
    [[2,{}], [1,{}], true],
    [[2,{}], [1,{a:1}], true],
    [[1,{}], [1,{a:1}], false],
    [[1,{a:1}], [1,{a:1}], false],
    [[1,{a:2}], [1,{a:1}], true],
    [[1,{a:2,b:1}], [1,{a:1,b:1}], true],
    [[0,{a:1,b:2,c:1}], [1,{a:1,b:1,c:2}], true],
    [[1,{a:1,b:1}], [1,{a:1}], true],
  ])('compares versions correctly (%o > %o = %s)', (version, min, result) => {
    const state = new SyncManager()
    try {
      expect(state.versionsAboveMin(version, min)).toBe(result)
    } finally {
      state.close()
    }
  })
})
