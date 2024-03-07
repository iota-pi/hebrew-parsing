import patcher, { ConflictError } from './jsonUtil'

describe('flexible array patching', () => {
  it('re-adjusts indexes (from same position)', () => {
    const a = [1, 2, 3, 4]
    const b = [2, 1, 3, 4]
    const c = [2, 3, 4, 1]
    const diff1 = patcher.diff(a, b)!
    const diff2 = patcher.diff(a, c)!
    const final = patcher.clone(a)
    patcher.patch(final, diff1)
    expect(final).toEqual(b)
    patcher.patch(final, diff2)
    expect(final).toEqual(c)
  })

  it('nested move', () => {
    const a = [0, 1, 2, 3, 4]
    const b = [1, 2, 3, 4, 0]
    const c = [0, 3, 1, 2, 4]
    const diff1 = patcher.diff(a, b)!
    const diff2 = patcher.diff(a, c)!
    const final = patcher.clone(a)
    patcher.patch(final, diff1)
    expect(final).toEqual(b)
    patcher.patch(final, diff2)
    expect(final).toEqual([3, 1, 2, 4, 0])
  })

  it('independent moves', () => {
    const a = [1, 2, 3, 4]
    const b = [2, 3, 4, 1]
    const c = [1, 2, 4, 3]
    const diff1 = patcher.diff(a, b)!
    const diff2 = patcher.diff(a, c)!
    const final = patcher.clone(a)
    patcher.patch(final, diff1)
    patcher.patch(final, diff2)
    expect(final).toEqual([2, 4, 3, 1])
  })

  it('indentical moves', () => {
    const a = [1, 2, 3, 4]
    const b = [2, 1, 3, 4]
    const c = [2, 1, 3, 4]
    const diff1 = patcher.diff(a, b)!
    const diff2 = patcher.diff(a, c)!
    const final = patcher.clone(a)
    patcher.patch(final, diff1)
    patcher.patch(final, diff2)
    expect(final).toEqual([2, 1, 3, 4])
  })

  it('cross-over moves', () => {
    const a = [1, 2, 3, 4]
    const b = [2, 3, 1, 4]
    const c = [3, 1, 2, 4]
    const diff1 = patcher.diff(a, b)!
    const diff2 = patcher.diff(a, c)!
    const final = patcher.clone(a)
    patcher.patch(final, diff1)
    patcher.patch(final, diff2)
    expect(final).toEqual([3, 2, 1, 4])
  })

  it('cross-over moves in the middle of the array', () => {
    const a = [0, 1, 2, 3, 4]
    const b = [0, 2, 3, 1, 4]
    const c = [0, 1, 4, 2, 3]
    const diff1 = patcher.diff(a, b)!
    const diff2 = patcher.diff(a, c)!
    const final = patcher.clone(a)
    patcher.patch(final, diff1)
    patcher.patch(final, diff2)
    expect(final).toEqual([0, 2, 4, 3, 1])
  })

  it('handles (skips) removed values', () => {
    const a = [1, 2, 3, 4]
    const b = [2, 3, 4]
    const c = [2, 3, 4, 1]
    const diff1 = patcher.diff(a, b)!
    const diff2 = patcher.diff(a, c)!
    const final = patcher.clone(a)
    patcher.patch(final, diff1)
    expect(final).toEqual(b)
    patcher.patch(final, diff2)
    expect(final).toEqual(b)
  })

  it('handles object equality (removed value)', () => {
    const a = [{ a: 0 }, { b: 1 }, { c: 2 }, { d: 3 }]
    const b = [{ a: 0 }, { c: 2 }, { d: 3 }]
    const c = [{ a: 0 }, { c: 2 }, { d: 3 }, { b: 1 }]
    const diff1 = patcher.diff(a, b)!
    const diff2 = patcher.diff(a, c)!
    const final = patcher.clone(a)
    patcher.patch(final, diff1)
    expect(final).toEqual(b)
    patcher.patch(final, diff2)
    expect(final).toEqual(b)
  })

  it('handles object equality (adjusted index)', () => {
    const a = [{ a: 0 }, { b: 1 }, { c: 2 }, { d: 3 }]
    const b = [{ b: 1 }, { a: 0 }, { c: 2 }, { d: 3 }]
    const c = [{ a: 0 }, { c: 2 }, { d: 3 }, { b: 1 }]
    const diff1 = patcher.diff(a, b)!
    const diff2 = patcher.diff(a, c)!
    const final = patcher.clone(a)
    patcher.patch(final, diff1)
    expect(final).toEqual(b)
    patcher.patch(final, diff2)
    expect(final).toEqual([{ a: 0 }, { c: 2 }, { b: 1 }, { d: 3 }])
  })

  it('deletes multiple objects', () => {
    const a = [{ a: 0 }, { a: 0 }, { a: 0 }, { a: 0 }]
    const b: typeof a = []
    const diff = patcher.diff(a, b)!
    const final = patcher.clone(a)
    patcher.patch(final, diff)
    expect(final).toEqual(b)
  })
})

describe('general patching', () => {
  it('gives error for overlapping edits', () => {
    const a = { a: 0, b: 1 }
    const b = { a: 0, b: 2 }
    const c = { a: 0, b: 3 }
    const diff1 = patcher.diff(a, b)!
    const diff2 = patcher.diff(a, c)!
    const final = patcher.clone(a)
    patcher.patch(final, diff1)
    expect(final).toEqual(b)
    expect(() => patcher.patch(final, diff2)).toThrow(ConflictError)
  })

  it('overlapping edits when changing to the same value are fine', () => {
    const a = { a: 0, b: 1 }
    const b = { a: 0, b: 2 }
    const c = { a: 0, b: 2 }
    const diff1 = patcher.diff(a, b)!
    const diff2 = patcher.diff(a, c)!
    const final = patcher.clone(a)
    patcher.patch(final, diff1)
    expect(final).toEqual(b)
    expect(() => patcher.patch(final, diff2)).not.toThrow()
  })

  it('patching in sequence works', () => {
    const a = { a: 0, b: 1 }
    const b = { a: 0, b: 2 }
    const c = { a: 0, b: 3 }
    const diff1 = patcher.diff(a, b)!
    const final = patcher.clone(a)
    patcher.patch(final, diff1)
    expect(final).toEqual(b)

    const diff2 = patcher.diff(final, c)!
    patcher.patch(final, diff2)
    expect(final).toEqual(c)
  })

  it('ignores duplicate values added to array', () => {
    const a = [1, 2, 3]
    const b = [1, 2, 3, 4]
    const c = [1, 4, 2, 3, 4]

    const diff1 = patcher.diff(a, b)!
    const intermediate = patcher.clone(a)
    patcher.patch(intermediate, diff1)
    expect(intermediate).toEqual(b)

    const diff2 = patcher.diff(intermediate, c)!
    const final = patcher.clone(intermediate)
    patcher.patch(final, diff2)
    expect(final).toEqual(b)
  })
})
