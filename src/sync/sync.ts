import SyncManager from './SyncManager'

const sync = new SyncManager()
export default sync

if (import.meta.hot) {
  // In development, clean up socket before hot reloading
  if (import.meta.hot.data.prevSync) {
    import.meta.hot.data.prevSync.close()
  }
  import.meta.hot.data.prevSync = sync
}
