import { Button } from '@mui/material'
import { useCallback, useEffect, useState } from 'react'
import { useAppSelector } from '../store'
import sync from '../sync/sync'
import SyncDialog from './dialogs/SyncDialog'
import { CheckIcon } from './Icons'

function MultiDeviceSync() {
  const syncSession = useAppSelector(state => state.ui.syncSession)
  const [showSync, setShowSync] = useState(syncSession === '')

  const handleClickSync = useCallback(() => setShowSync(true), [])
  const handleCloseSync = useCallback(() => setShowSync(false), [])

  useEffect(
    () => {
      if (syncSession === '') {
        setShowSync(true)
      }
    },
    [syncSession],
  )

  const [activeSync, setActiveSync] = useState(false)
  useEffect(
    () => {
      const interval = window.setInterval(
        () => {
          setActiveSync(sync.connected)
          if (!sync.connected) {
            setShowSync(true)
          }
          if (sync.justAutoReconnected) {
            setShowSync(false)
          }
        },
        100,
      )
      return () => window.clearInterval(interval)
    },
    [],
  )

  return (
    <>
      <Button
        endIcon={activeSync ? <CheckIcon /> : undefined}
        onClick={handleClickSync}
        variant="outlined"
      >
        Multi-device Sync
      </Button>

      <SyncDialog
        onClose={handleCloseSync}
        open={showSync}
      />
    </>
  )
}

export default MultiDeviceSync
