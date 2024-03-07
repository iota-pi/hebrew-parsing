import {
  type ChangeEvent,
  Fragment,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  Box,
  Button,
  Checkbox,
  Divider,
  FormControlLabel,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Stack,
  styled,
  SwipeableDrawer,
  TextField,
  Typography,
} from '@mui/material'
import { useAppDispatch, useAppSelector } from '../../store'
import { setEditPerson } from '../../state/editPerson'
import {
  CAMPUS_MAP,
  type GroupTime,
  type GroupMember,
} from '../../state/people'
import {
  useGroupExtraOptions,
  useGroupTimeOptions,
  usePeopleMap,
} from '../../state/selectors'
import {
  getLeaderKey,
  getTimeId,
  getTimesKey,
  isLeader,
  prettyTimeString,
  sortMemberIds,
} from '../../util'
import { CheckIcon, ResetIcon } from '../Icons'
import sync from '../../sync/sync'
import type { BGFAction } from '../../sync/bgfActions'

const Content = styled(Stack)(({ theme }) => ({
  padding: theme.spacing(2),
  overflowX: 'hidden',
  overflowY: 'auto',
}))
const ListItemCheckbox = styled(ListItemIcon)(({ theme }) => ({
  minWidth: theme.spacing(4),
}))

function TimesList({
  person,
  allTimes,
  onClickTime,
}: {
  person: GroupMember,
  allTimes: GroupTime[],
  onClickTime?: (time: GroupTime) => () => void,
}) {
  const groupType = useAppSelector(state => state.groupType)
  const times = person ? person[getTimesKey(groupType)] : []

  return (
    <List disablePadding>
      {allTimes.map(time => (
        <ListItemButton
          key={getTimeId(time)}
          dense
          onClick={onClickTime?.(time)}
          disabled={!onClickTime}
        >
          <ListItemCheckbox>
            <Checkbox
              checked={
                times.findIndex(t => getTimeId(t) === getTimeId(time)) > -1
              }
              disableRipple
              edge="start"
              size="small"
            />
          </ListItemCheckbox>

          <ListItemText
            primary={prettyTimeString(time.time)}
            secondary={time.campus !== 'main' ? CAMPUS_MAP[time.campus] : undefined}
          />
        </ListItemButton>
      ))}
    </List>
  )
}

function EditDrawer() {
  const drawerWidth = '50vw'
  const dispatch = useAppDispatch()

  const [open, setOpen] = useState(false)
  const groupsObject = useAppSelector(state => state.groups.groups)
  const groups = useMemo(() => Object.values(groupsObject), [groupsObject])
  const peopleMap = usePeopleMap()
  const groupType = useAppSelector(state => state.groupType)
  const editPersonId = useAppSelector(state => state.editPerson)
  const editPerson = useMemo(
    () => (editPersonId ? peopleMap.get(editPersonId) : undefined),
    [editPersonId, peopleMap],
  )

  const [justChangedLeader, setJustChangedLeader] = useState(false)

  useEffect(
    () => {
      if (editPersonId) {
        setOpen(true)
      }
    },
    [editPersonId],
  )

  useEffect(
    () => {
      if (justChangedLeader && editPersonId) {
        const targetGroup = groups.find(g => g.members.includes(editPersonId))
        if (targetGroup) {
          const actions: BGFAction[] = [{
            type: 'sortGroup',
            group: targetGroup.id,
            order: sortMemberIds(targetGroup.members, peopleMap, groupType),
          }]
          sync.syncActions(actions)
        }
        setJustChangedLeader(false)
      }
    },
    [dispatch, editPersonId, justChangedLeader, groups, groupType, peopleMap],
  )

  const edits = useAppSelector(state => state.people.edits)
  const groupTimes = useGroupTimeOptions()
  const groupOptions = useGroupExtraOptions()

  const hasEdit = useMemo(
    () => !!editPerson && Object.hasOwn(edits, editPerson.ccbId),
    [editPerson, edits],
  )

  const handleClickLeader = useCallback(
    () => {
      if (editPerson) {
        sync.syncActions({
          type: 'editPerson',
          person: editPerson.ccbId,
          content: {
            [getLeaderKey(groupType)]: !isLeader(editPerson),
          },
        })
        setJustChangedLeader(true)
      }
    },
    [dispatch, editPerson, groupType],
  )
  const handleChangeGender = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      if (editPerson) {
        sync.syncActions({
          type: 'editPerson',
          person: editPerson.ccbId,
          content: {
            gender: event.target.value as 'm' | 'f',
          },
        })
      }
    },
    [dispatch, editPerson],
  )
  const handleClickTime = useCallback(
    (time: GroupTime) => () => {
      if (editPerson) {
        const times = editPerson[getTimesKey(groupType)]
        const removed = times.filter(t => getTimeId(t) !== getTimeId(time))
        sync.syncActions({
          type: 'editPerson',
          person: editPerson.ccbId,
          content: {
            [getTimesKey(groupType)]: (
              removed.length < times.length ? removed : [...times, time]
            ),
          },
        })
      }
    },
    [dispatch, editPerson, groupType],
  )
  const handleClickOption = useCallback(
    (option: string) => () => {
      if (editPerson) {
        const { extraOptions } = editPerson
        const removed = extraOptions.filter(o => o !== option)
        const newOptions = (
          removed.length < extraOptions.length ? removed : [...extraOptions, option]
        )
        sync.syncActions({
          type: 'editPerson',
          person: editPerson.ccbId,
          content: {
            extraOptions: newOptions,
            [getLeaderKey(groupType)]: (
              newOptions.find(o => o.toLowerCase().includes('leader')) !== undefined
            ),
          },
        })
        setJustChangedLeader(true)
      }
    },
    [dispatch, editPerson, groupType],
  )
  const handleClickReset = useCallback(
    () => {
      if (editPerson) {
        sync.syncActions({ type: 'resetPerson', person: editPerson.ccbId })
      }
    },
    [dispatch, editPerson],
  )

  const handleClose = useCallback(() => setOpen(false), [])
  const handleExited = useCallback(() => dispatch(setEditPerson(null)), [dispatch])
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key === 'Enter') {
        handleClose()
      }
    },
    [handleClose],
  )

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  const handleOpen = useCallback(() => {}, [])

  return (
    <SwipeableDrawer
      anchor="right"
      disableSwipeToOpen
      onClose={handleClose}
      onOpen={handleOpen}
      onKeyDown={handleKeyDown}
      open={open}
      SlideProps={{ onExited: handleExited }}
      variant="temporary"
    >
      <Box sx={{ width: drawerWidth, overflowY: 'auto' }}>
        {editPerson && (
          <Content spacing={2}>
            <Typography variant="h3" fontWeight={300}>
              {editPerson.firstName} {editPerson.lastName}
            </Typography>

            <FormControlLabel
              control={(
                <Checkbox
                  checked={isLeader(editPerson)}
                  onClick={handleClickLeader}
                />
              )}
              label="Leader"
            />

            <TextField
              fullWidth
              label="Gender"
              onChange={handleChangeGender}
              select
              value={editPerson.gender}
            >
              <MenuItem value="m">Male</MenuItem>
              <MenuItem value="f">Female</MenuItem>
            </TextField>

            <div>
              <Typography variant="h5" fontWeight={300}>
                Available times
              </Typography>

              <TimesList
                allTimes={groupTimes}
                person={editPerson}
                onClickTime={handleClickTime}
              />
            </div>

            {groupType === 'Bible Study' && (
              <div>
                <Typography variant="h5" fontWeight={300}>
                  Extra Options
                </Typography>

                <List disablePadding>
                  {groupOptions.map(option => (
                    <ListItemButton
                      key={option}
                      dense
                      onClick={handleClickOption(option)}
                    >
                      <ListItemCheckbox>
                        <Checkbox
                          checked={editPerson.extraOptions.includes(option)}
                          disableRipple
                          edge="start"
                          size="small"
                        />
                      </ListItemCheckbox>

                      <ListItemText primary={option} />
                    </ListItemButton>
                  ))}
                </List>
              </div>
            )}

            <div>
              <Typography variant="h5" fontWeight={300}>
                Comment
              </Typography>

              <Typography color={editPerson.comments ? undefined : 'text.secondary'}>
                {editPerson.comments || '(no comments)'}
              </Typography>
            </div>

            <div>
              <Divider sx={{ my: 1 }} />
            </div>

            {editPerson.previous.length > 0 && (
              <div>
                <Typography variant="h5" fontWeight={300}>
                  Previous sign-ups
                </Typography>

                {editPerson.previous.map(previousPerson => (
                  <Fragment key={previousPerson.responseId}>
                    <Typography variant="h6" fontWeight={300}>
                      Previous Times
                    </Typography>

                    <TimesList
                      allTimes={groupTimes}
                      person={previousPerson}
                    />

                    <Typography variant="h6" fontWeight={300}>
                      Previous Comment
                    </Typography>

                    <Typography color={previousPerson.comments ? undefined : 'text.secondary'}>
                      {previousPerson.comments || '(no comments)'}
                    </Typography>
                  </Fragment>
                ))}
              </div>
            )}
          </Content>
        )}
      </Box>

      <Box>
        <Divider />

        <Stack padding={2} spacing={2} direction="row">
          <Button
            disabled={!hasEdit}
            onClick={handleClickReset}
            fullWidth
            startIcon={<ResetIcon />}
            variant="outlined"
          >
            Reset
          </Button>

          <Button
            fullWidth
            onClick={handleClose}
            variant="contained"
            startIcon={<CheckIcon />}
          >
            Done
          </Button>
        </Stack>
      </Box>
    </SwipeableDrawer>
  )
}

export default EditDrawer
