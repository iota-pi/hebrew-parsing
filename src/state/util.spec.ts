import { Projection } from '../../lambda/types'
import { applyProjection } from './util'

describe('applyProjection', () => {
  it('applies a projection', () => {
    const obj = {
      a: 1,
      b: 2,
      c: {
        d: 3,
        e: 4,
      },
      f: 5,
      g: {
        h: 6,
        i: 7,
      }
    }
    const projection: Projection = {
      a: true,
      b: false,
      c: {
        d: true,
      },
      g: true,
    }
    expect(applyProjection(obj, projection)).toEqual({
      a: 1,
      c: {
        d: 3,
      },
      g: {
        h: 6,
        i: 7,
      },
    })
  })
})
