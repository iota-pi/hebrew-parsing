import { checkLoggedIn, deleteConnection, getAllConnections, getOtherConnections, register } from './connections'
import { getSessionId } from './util'

describe('connections', () => {
  it('can register a connection', async () => {
    const session = getSessionId(10)
    const connection = getSessionId()
    await register(session, connection)

    const result = await getAllConnections(session)
    expect(result).toContain(connection)
  })

  it('can register multiple connections to the same session', async () => {
    const session = getSessionId(10)
    const connections = [
      getSessionId(),
      getSessionId(),
      getSessionId(),
      getSessionId(),
    ]
    await Promise.all(connections.map(c => register(session, c)))

    const result = await getAllConnections(session)
    expect(new Set(result)).toEqual(new Set(connections))

    const otherConnections = await getOtherConnections(session, connections[0])
    expect(new Set(otherConnections)).toEqual(new Set(connections.slice(1)))
  })

  it('can delete connections', async () => {
    const session = getSessionId(10)
    const connections = [
      getSessionId(),
      getSessionId(),
      getSessionId(),
      getSessionId(),
    ]
    await Promise.all(connections.map(c => register(session, c)))
    await deleteConnection(session, connections[0])

    const result = await getAllConnections(session)
    expect(new Set(result)).toEqual(new Set(connections.slice(1)))
  })

  it('check logged in works', async () => {
    const session = getSessionId(10)
    const connection = getSessionId()
    await register(session, connection)

    expect(await checkLoggedIn(session)).toBe(true)
    expect(await checkLoggedIn(getSessionId())).toBe(false)
  })
})
