import {
  Alert,
  Link,
  Stack,
  Typography,
} from '@mui/material'
import { CCB_BASE, MED_SIGNUP_FORM_ID, SIGNUP_FORM_ID } from '../util'

function ImportReport({
  count,
  duplicates,
  error,
  unmatched,
}: {
  count: number,
  duplicates: number,
  error: boolean,
  unmatched: number,
}) {
  return (
    <Stack spacing={1}>
      {error && (
        <Alert severity="error">
          There was a problem processing this data.
        </Alert>
      )}

      {count > 0 && (
        <Alert>
          <Typography>
            Successfully processed data for {count} people
            {duplicates > 0 && (
              <>
                {' '}
                (<strong>{duplicates}</strong> duplicate entries not counted)
                <br />
                The most recent form response for each person will be used.
              </>
            )}
          </Typography>
        </Alert>
      )}

      {unmatched > 0 && (
        <Alert severity="warning">
          <Typography>
            <strong>{unmatched}</strong> responses have not yet been matched to CCB profiles
            and will be excluded.
            Please match and/or create profiles for everyone before proceeding.
            <br />
            <Link
              href={
                `${CCB_BASE}/form_response_list.php?id=${SIGNUP_FORM_ID}&show=unmatched`
              }
              rel="noreferrer"
              target="_blank"
            >
              Match for main signup form
            </Link>

            {SIGNUP_FORM_ID !== MED_SIGNUP_FORM_ID && (
              <>
                <br />
                <Link
                  href={
                    `${CCB_BASE}/form_response_list.php?id=${MED_SIGNUP_FORM_ID}&show=unmatched`
                  }
                  rel="noreferrer"
                  target="_blank"
                >
                  Match for med signup form
                </Link>
              </>
            )}
          </Typography>
        </Alert>
      )}
    </Stack>
  )
}

export default ImportReport
