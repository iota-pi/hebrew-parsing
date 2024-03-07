import { ALL_CAMPUSES } from './state/people'
import { getCampusId } from './util'

it('each campus has a unique id', () => {
  const ids = ALL_CAMPUSES.map(campus => getCampusId(campus))
  expect(ids.length).toBe(new Set(ids).size)
})
