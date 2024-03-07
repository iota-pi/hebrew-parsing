import { ChangeEvent, useCallback, useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
} from '@mui/material'
import {
  LoadingButton,
} from '@mui/lab'
import { setPassword } from '../../state/ui'
import { useAppDispatch, useAppSelector } from '../../store'
import sync from '../../sync/sync'

export interface Props {
  onClose?: () => void,
  onLogin?: (password: string) => void,
  open: boolean,
}


function CCBLoginDialog({
  onClose,
  onLogin,
  open,
}: Props) {
  const dispatch = useAppDispatch()
  const [password, setLocalPassword] = useState('')
  const [error, setError] = useState('')

  const alertMessage = useAppSelector(state => state.ui.message)

  const handleChangePassword = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setLocalPassword(event.target.value)
    },
    [],
  )

  const [loading, setLoading] = useState(false)

  const handleClickLogin = useCallback(
    async () => {
      setLoading(true)
      onLogin?.(password)
      const success = await sync.checkPassword(password)
      setLoading(false)
      if (success) {
        dispatch(setPassword(password))
      } else {
        setError('Login failed')
      }
    },
    [dispatch, onLogin, password],
  )

  useEffect(
    () => {
      if (alertMessage.error) {
        sync.abortLoginAttempt()
      }
    },
    [alertMessage.error],
  )

  return (
    <Dialog
      open={open}
      onClose={onClose}
    >
      <DialogTitle>
        BGF Login
      </DialogTitle>

      <DialogContent>
        <Stack alignItems="center" spacing={1.5}>
          <div>
            You must be logged in to use this tool.
            If you are looking for the main CBS website, you can find it
            {' '}
            <a href="https://campusbiblestudy.org/">here</a>
            .
          </div>

          <div />

          <TextField
            autoFocus
            error={!!error}
            fullWidth
            helperText={error}
            label="BGF Password"
            onChange={handleChangePassword}
            type="password"
            value={password}
          />

          <LoadingButton
            disabled={loading || !password}
            fullWidth
            loading={loading}
            onClick={handleClickLogin}
            variant="contained"
          >
            Login
          </LoadingButton>
        </Stack>
      </DialogContent>
    </Dialog>
  )
}

export default CCBLoginDialog
