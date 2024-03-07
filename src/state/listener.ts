import MemberMonitor from './MemberMonitor'

const monitor = new MemberMonitor()
export default monitor

if (import.meta.hot) {
  // In development, clean up socket before hot reloading
  if (import.meta.hot.data.prevMemberMonitor) {
    import.meta.hot.data.prevMemberMonitor.close()
  }
  import.meta.hot.data.prevMemberMonitor = monitor
}
