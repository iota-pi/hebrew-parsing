import {
  Autocomplete,
  AutocompleteChangeDetails,
  AutocompleteChangeReason,
  Box,
  Button,
  Chip,
  Divider,
  Link,
  MenuItem,
  Stack,
  styled,
  TextField,
} from '@mui/material'
import { ChangeEvent, useCallback, useState } from 'react'
import { DropzoneArea } from 'material-ui-dropzone'
import { ALL_CAMPUSES, CampusName, CAMPUS_MAP, setPeople } from '../../state/people'
import { useAllFaculties, usePeopleMap } from '../../state/selectors'
import { useAppDispatch, useAppSelector } from '../../store'
import {
  CCB_BASE,
  countUnmatched,
  deduplicate,
  MAIN_TERM_NUMBER,
  MED_SIGNUP_FORM_ID,
  MED_TERM_NUMBER,
  parseData,
  SIGNUP_FORM_ID,
} from '../../util'
import CustomPeople from '../CustomPeople'
import ConfirmationDialog from '../dialogs/ConfirmationDialog'
import ImportReport from '../ImportReport'
import MultiDeviceSync from '../MultiDeviceSync'
import { setSync } from '../../state/ui'
import { resetAll } from '../../state/actions'
import { GroupType, GROUP_TYPES } from '../../state/groupType'
import sync from '../../sync/sync'

const AutocompleteChip = styled(Chip)(({ theme }) => ({
  marginRight: theme.spacing(1),
  marginTop: theme.spacing(0.25),
  marginBottom: theme.spacing(0.25),
}))

function DataPage() {
  const dispatch = useAppDispatch()
  const allFaculties = useAllFaculties()
  const groupType = useAppSelector(state => state.groupType)
  const selectedFaculties = useAppSelector(state => state.faculties)
  const selectedCampuses = useAppSelector(state => state.campuses)
  const peopleMap = usePeopleMap()
  const hasImported = peopleMap.size > 0

  const [showConfirm, setShowConfirm] = useState(false)
  const [importResult, setImportResult] = useState({
    count: 0,
    duplicates: 0,
    error: false,
    unmatched: 0,
  })

  const handleChange = useCallback(
    async (files: File[]) => {
      if (files.length > 0) {
        const file = files[0]
        const text = await file.text()
        parseData(text).then(processed => {
          const deduped = deduplicate(processed)
          const count = deduped.length
          const unmatched = countUnmatched(processed)
          const duplicates = processed.length - count - unmatched
          setImportResult({
            count,
            duplicates,
            error: false,
            unmatched,
          })
          dispatch(setPeople(deduped))
        }).catch(error => {
          console.error(error)
          setImportResult({
            count: 0,
            duplicates: 0,
            error: true,
            unmatched: 0,
          })
        })
      }
    },
    [dispatch],
  )

  const handleChangeType = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const newGroupType = event.target.value as GroupType
      sync.syncActions({
        type: 'setGroupType',
        value: newGroupType,
      })
    },
    [],
  )
  const handleChangeFaculties = useCallback(
    (
      _: React.SyntheticEvent,
      __: string[],
      reason: AutocompleteChangeReason,
      details?: AutocompleteChangeDetails,
    ) => {
      if (reason === 'selectOption') {
        if (details?.option) {
          sync.syncActions({
            type: 'addFaculty',
            faculty: details.option,
          })
        }
      } else if (reason === 'removeOption') {
        if (details?.option) {
          sync.syncActions({
            type: 'removeFaculty',
            faculty: details.option,
          })
        }
      } else if (reason === 'clear') {
        sync.syncActions({
          type: 'clearFaculties',
        })
      }
    },
    [],
  )
  const handleRemoveFaculty = useCallback(
    (faculty: string) => () => {
      sync.syncActions({
        type: 'removeFaculty',
        faculty,
      })
    },
    [],
  )
  const handleChangeCampuses = useCallback(
    (
      _: React.SyntheticEvent,
      __: string[],
      reason: AutocompleteChangeReason,
      details?: AutocompleteChangeDetails,
    ) => {
      if (reason === 'selectOption') {
        if (details?.option) {
          sync.syncActions({
            type: 'addCampus',
            campus: details.option as CampusName,
          })
        }
      } else if (reason === 'removeOption') {
        if (details?.option) {
          sync.syncActions({
            type: 'removeCampus',
            campus: details.option as CampusName,
          })
        }
      } else if (reason === 'clear') {
        sync.syncActions({
          type: 'clearCampuses',
        })
      }
    },
    [],
  )
  const handleRemoveCampus = useCallback(
    (campus: CampusName) => () => {
      sync.syncActions({
        type: 'removeCampus',
        campus,
      })
    },
    [],
  )

  const handleReset = useCallback(() => setShowConfirm(true), [])
  const handleCloseConfirm = useCallback(() => setShowConfirm(false), [])
  const handleConfirmReset = useCallback(
    () => {
      dispatch(setSync(''))
      dispatch(resetAll())
      setImportResult({
        count: 0,
        duplicates: 0,
        error: false,
        unmatched: 0,
      })
      setShowConfirm(false)
    },
    [dispatch],
  )

  return (
    <Box padding={2}>
      <Stack spacing={2}>
        <MultiDeviceSync />

        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box display="flex" flexDirection="column">
            <Link
              href={
                `${CCB_BASE}/output/form_responses.php?form_id=${SIGNUP_FORM_ID}&output_type=csv`
              }
              rel="noreferrer"
              target="_blank"
            >
              Export form responses (main—term {MAIN_TERM_NUMBER})
            </Link>

            {SIGNUP_FORM_ID !== MED_SIGNUP_FORM_ID && (
              <Link
                href={
                  `${CCB_BASE}/output/form_responses.php?form_id=${MED_SIGNUP_FORM_ID}&output_type=csv`
                }
                rel="noreferrer"
                target="_blank"
              >
                Export form responses (med—term {MED_TERM_NUMBER})
              </Link>
            )}
          </Box>

          <Button onClick={handleReset}>
            Reset Everything
          </Button>
        </Box>

        <DropzoneArea
          acceptedFiles={['.csv']}
          disableRejectionFeedback
          filesLimit={1}
          dropzoneText="Load exported form responses here"
          showAlerts={['error']}
          showPreviewsInDropzone={false}
          maxFileSize={1000000}
          onChange={handleChange}
        />

        <ImportReport
          count={importResult.count}
          duplicates={importResult.duplicates}
          error={importResult.error}
          unmatched={importResult.unmatched}
        />

        {hasImported && (
          <Stack spacing={2}>
            <Divider />

            <TextField
              label="Group type"
              onChange={handleChangeType}
              select
              value={groupType}
            >
              {GROUP_TYPES.map(opt => (
                <MenuItem key={opt} value={opt}>{opt}</MenuItem>
              ))}
            </TextField>

            <Autocomplete
              disabled={allFaculties.length === 0 || groupType !== 'Bible Study'}
              multiple
              onChange={handleChangeFaculties}
              options={allFaculties}
              value={selectedFaculties}
              renderTags={tags => (
                tags.map(tag => (
                  <AutocompleteChip
                    disabled={groupType !== 'Bible Study'}
                    key={tag}
                    label={tag}
                    onDelete={handleRemoveFaculty(tag)}
                  />
                ))
              )}
              renderInput={
                params => <TextField {...params} label="Faculties" />
              }
            />

            <Autocomplete
              disabled={groupType !== 'Bible Study'}
              multiple
              onChange={handleChangeCampuses}
              options={ALL_CAMPUSES}
              getOptionLabel={(campus: CampusName) => CAMPUS_MAP[campus]}
              value={selectedCampuses}
              renderTags={tags => (
                tags.map(campus => (
                  <AutocompleteChip
                    disabled={groupType !== 'Bible Study'}
                    key={campus}
                    label={CAMPUS_MAP[campus]}
                    onDelete={handleRemoveCampus(campus)}
                  />
                ))
              )}
              renderInput={
                params => <TextField {...params} label="Campuses" />
              }
            />

            <Divider />

            <CustomPeople />
          </Stack>
        )}
      </Stack>

      <ConfirmationDialog
        open={showConfirm}
        onCancel={handleCloseConfirm}
        onConfirm={handleConfirmReset}
      >
        Are you sure you want to reset everything?
      </ConfirmationDialog>
    </Box>
  )
}

export default DataPage
