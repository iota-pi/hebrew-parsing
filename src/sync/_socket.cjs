module.exports = (
  typeof process !== undefined
    ? require('ws').WebSocket
    : globalThis.WebSocket
)
