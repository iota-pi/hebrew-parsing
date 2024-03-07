import { ChangeEvent, useCallback, useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import {
  LoadingButton,
} from '@mui/lab'
import sync from '../../sync/sync'
import { useAppDispatch, useAppSelector } from '../../store'
import { CheckIcon, DuplicateIcon } from '../Icons'
import { resetAll } from '../../state/actions'
import { setSync } from '../../state/ui'

export interface Props {
  onClose: () => void,
  open: boolean,
}


function SyncDialog({
  onClose,
  open,
}: Props) {
  const dispatch = useAppDispatch()
  const registeredSession = useAppSelector(state => state.ui.syncSession)

  const [sessionField, setSessionField] = useState(registeredSession)
  const handleChangeSession = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setSessionField(event.target.value)
    },
    [],
  )

  const [loading, setLoading] = useState(false)

  const handleClickNew = useCallback(
    () => {
      dispatch(resetAll())
      setLoading(true)
      sync.register()
    },
    [dispatch],
  )
  const handleClickJoin = useCallback(
    () => {
      if (sessionField && (sessionField !== registeredSession || !sync.connected)) {
        setLoading(true)
        sync.register(sessionField)
        dispatch(setSync(sessionField))
      }
      onClose()
    },
    [dispatch, onClose, registeredSession, sessionField],
  )

  const [justCopied, setJustCopied] = useState(false)
  const handleClickCopy = useCallback(
    () => {
      navigator.clipboard.writeText(sessionField)
      setJustCopied(true)
    },
    [sessionField],
  )
  useEffect(
    () => {
      if (justCopied) {
        const timeout = window.setTimeout(
          () => setJustCopied(false),
          2000,
        )
        return () => window.clearTimeout(timeout)
      }
      return undefined
    },
    [justCopied],
  )

  useEffect(
    () => {
      if (registeredSession) {
        setLoading(false)
      }
      setSessionField(registeredSession)
    },
    [registeredSession],
  )
  useEffect(
    () => {
      if (loading) {
        const timeout = window.setTimeout(() => {
          setLoading(false)
        }, 1000)
        return () => window.clearTimeout(timeout)
      }
      return undefined
    },
    [loading],
  )

  useEffect(
    () => {
      const timeout = window.setTimeout(
        () => {
          if (sync.connecting) {
            setLoading(true)
          }
        },
        100,
      )
      return () => window.clearTimeout(timeout)
    },
    [],
  )

  return (
    <Dialog open={open}>
      <DialogTitle>
        Multi-device Sync
      </DialogTitle>

      <DialogContent>
        <Stack alignItems="center" spacing={1}>
          <LoadingButton
            disabled={loading}
            fullWidth
            loading={loading}
            onClick={handleClickNew}
            variant={sessionField ? 'outlined' : 'contained'}
          >
            Create New Session
          </LoadingButton>

          <Typography variant="h5">
            OR
          </Typography>

          <TextField
            label="Session ID"
            onChange={handleChangeSession}
            value={sessionField}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    disabled={!sessionField || sessionField !== registeredSession}
                    onClick={handleClickCopy}
                  >
                    {justCopied ? <CheckIcon /> : <DuplicateIcon />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <LoadingButton
            disabled={loading || !sessionField}
            fullWidth
            loading={loading}
            onClick={handleClickJoin}
            variant="contained"
          >
            {sessionField && sessionField === registeredSession ? 'Done' : 'Join Session'}
          </LoadingButton>
        </Stack>
      </DialogContent>
    </Dialog>
  )
}

export default SyncDialog
