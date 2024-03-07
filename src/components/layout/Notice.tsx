import { Alert } from '@mui/material'
import Snackbar from '@mui/material/Snackbar'
import { useCallback } from 'react'
import { clearMessage } from '../../state/ui'
import { useAppDispatch, useAppSelector } from '../../store'


const Notice = () => {
  const { message, error } = useAppSelector(state => state.ui.message)
  const dispatch = useAppDispatch()

  const handleClose = useCallback(
    () => dispatch(clearMessage()), [dispatch],
  )

  const timeout = 6000

  return (
    <Snackbar
      key={message || 'snackbar'}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      open={message !== ''}
      onClose={handleClose}
      ContentProps={{ 'aria-describedby': 'message-id' }}
      autoHideDuration={timeout}
    >
      <Alert
        id="message-id"
        onClose={handleClose}
        severity={error ? 'error' : 'info'}
        sx={{ width: '100%' }}
      >
        {message}
      </Alert>
    </Snackbar>
  )
}

export default Notice
