import { Alert, Box, Button, MenuItem, Stack, TextField, Typography } from '@mui/material'
import { ChangeEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { CreateGroupData } from '../../../lambda/types'
import { useFilteredPeople, usePeople, usePeopleMap } from '../../state/selectors'
import { setMessage } from '../../state/ui'
import { useAppDispatch, useAppSelector } from '../../store'
import sync from '../../sync/sync'
import {
  NOT_IN_A_GROUP_ID,
  getCCBGroupName,
  getGenderBalance,
  getTimesKey,
  isDefined,
  isLeader,
  prettyTimeString,
} from '../../util'
import CreateGroupsProgress from '../CreateGroupsProgress'
import ConfirmationDialog from '../dialogs/ConfirmationDialog'
import { CheckIcon } from '../Icons'

const CAMPUS_OPTIONS = [
  'Campus',
  'FOCUS Cantonese',
  'FOCUS Indonesia',
  'FOCUS International',
  'FOCUS Mandarin',
  'Unichurch',
  'Staff and Post-Grads',
  'CBS Alumni and Supporters',
]
const DEPARTMENT_OPTIONS = [
  'Staff',
  'Core Training',
  'FOCUS Team',
  'LIFT',
  'Campus',
  'FIC Bible Studies',
]
const GROUP_TYPE_OPTIONS = [
  'Bible Study',
  'Training Group',
  'Service Team',
  'Special Interest',
  'Task / Action',
  'Main Ministry Group',
  'Public Meeting',
  'Campus',
  'Staff',
  'Alumni',
  'Fundraising',
  'Personal Supporters Group',
]

function getDefaultTerm() {
  const m = new Date().getMonth() + 1
  if (m < 3 || m >= 11) {
    return 'T1'
  } else if (m < 8) {
    return 'T2'
  }
  return 'T3'
}

function GroupsPage() {
  const dispatch = useAppDispatch()
  const allPeople = usePeople()
  const peopleMap = usePeopleMap()
  const allGroups = useAppSelector(state => state.groups.groups)
  const existingCCBIds = useAppSelector(state => state.groups.ccbIds)
  const faculties = useAppSelector(state => state.faculties)
  const groupType = useAppSelector(state => state.groupType)

  const groups = useMemo(
    () => {
      const { [NOT_IN_A_GROUP_ID]: _, ...rest} = allGroups
      return rest
    },
    [allGroups],
  )

  const [campus, setCampus] = useState('Campus')
  const [ccbGroupType, setCCBGroupType] = useState('Bible Study')
  const [department, setDepartment] = useState('Campus')
  const [faculty, setFaculty] = useState<string>('')
  const [term, setTerm] = useState(getDefaultTerm())

  const [dataSentToCreate, setDataSentToCreate] = useState<CreateGroupData[]>([])
  const [refreshCounter, setRefreshCounter] = useState(0)
  const [showConfirm, setShowConfirm] = useState(false)
  const [removeIdsCache, setRemoveIdsCache] = useState<number[]>([])

  useEffect(
    () => {
      const primary = (faculties[0] || '').toLowerCase().replaceAll('and', '&')
      const mapping: { [key: string]: string } = {
        ada: 'ADA',
        'art & social sciences': 'ADA',
        'built environment': 'ADA',
        business: 'Bus',
        cse: 'CSE',
        'computer science & engineering (cse)': 'CSE',
        education: 'Edu',
        engineering: 'Eng',
        law: 'Law',
        medicine: 'Med',
        science: 'Sci',
        'unsw art & design': 'ADA',
      }
      setFaculty(mapping[primary] || primary.slice(0, 3))
    },
    [faculties],
  )

  const handleChangeCampus = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => setCampus(event.target.value),
    [],
  )
  const handleChangeDepartment = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => setDepartment(event.target.value),
    [],
  )
  const handleChangeGroupType = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => setCCBGroupType(event.target.value),
    [],
  )
  const handleChangeTerm = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => setTerm(event.target.value),
    [],
  )
  const handleChangeFaculty = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => setFaculty(event.target.value),
    [],
  )

  const ccbGroupStats = useMemo(
    () => {
      const groupsWithMembers = Object.values(groups).filter(g => g.members.length > 0)
      const continuingCCBIds = groupsWithMembers.map(g => g.ccbId).filter(id => id > 0)
      const removeIds = existingCCBIds.filter(id => !continuingCCBIds.includes(id))
      return {
        add: groupsWithMembers.length - continuingCCBIds.length,
        update: continuingCCBIds.length,
        remove: removeIds.length,
        removeIds,
      }
    },
    [allGroups, existingCCBIds],
  )

  const handleClickCreate = useCallback(
    () => {
      setShowConfirm(true)
      setRemoveIdsCache(ccbGroupStats.removeIds)
    },
    [ccbGroupStats],
  )
  const handleClickCancelCreate = useCallback(() => setShowConfirm(false), [])
  const handleConfirmCreate = useCallback(
    async () => {
      setShowConfirm(false)
      if (!sync.connected) {
        dispatch(setMessage({
          message: 'Not logged in. Cannot connect to CCB API',
          error: true,
        }))
      }

      const createData: CreateGroupData[] = []
      for (const group of Object.values(groups)) {
        if (group.members.length === 0) {
          continue
        }

        const time = group.time
        const members = group.members.map(m => peopleMap.get(m)).filter(isDefined)
        const groupName = getCCBGroupName({ faculty, members, term, time, groupType })
        createData.push({
          campus,
          ccbId: group.ccbId,
          ccbType: ccbGroupType,
          day: time.day,
          department,
          faculty,
          groupType,
          members,
          name: groupName,
          reactId: group.id,
          refreshCache: false,
          time: time.start,
        })
      }
      setDataSentToCreate(createData)
      setRefreshCounter(rc => rc + 1)

      for (const toRemove of ccbGroupStats.removeIds) {
        // eslint-disable-next-line no-await-in-loop
        await sync.removeGroup(toRemove).catch().finally(
          () => sync.syncActions({
            type: 'clearCCBId',
            ccbId: toRemove,
          }),
        )
      }

      let firstGroup = true
      for (const group of createData) {
        // eslint-disable-next-line no-await-in-loop
        await sync.createGroup({
          ...group,
          refreshCache: firstGroup,
        })
        firstGroup = false
      }
    },
    [
      campus,
      ccbGroupType,
      ccbGroupStats.removeIds,
      department,
      dispatch,
      faculty,
      groups,
      groupType,
      peopleMap,
      term,
    ],
  )

  const people = useFilteredPeople(groupType)
  const stillWantAGroup = useMemo(
    () => {
      const responseIds = new Set(Object.values(groups).flatMap(group => group.members))
      const notInAGroup = people.filter(person => !responseIds.has(person.responseId))

      return notInAGroup.filter(
        person => person[getTimesKey(groupType)].filter(
          t => !t.time.toLowerCase().includes('not this term'),
        ).length > 0,
      )
    },
    [groups, groupType, people],
  )

  const largeGroups = useMemo(
    () => Object.values(groups).filter(g => g.members.length > 10),
    [groups],
  )

  const badGenderBalanceGroups = useMemo(
    () => Object.values(groups).filter(group => {
      const members = group.members.map(m => peopleMap.get(m)).filter(isDefined)
      const { men, women } = getGenderBalance(members)
      if (members.length > 2 && (men === 1 || women === 1)) {
        return true
      }
      return false
    }),
    [groups, peopleMap],
  )

  const leaderlessGroups = useMemo(
    () => Object.values(groups).filter(group => (
      group.members.length > 0
      && group.members.filter(
        m => isLeader(peopleMap.get(m)),
      ).length === 0
    )),
    [groups, peopleMap],
  )

  const missingCCBIds = useMemo(
    () => allPeople.filter(p => !p.ccbId),
    [allPeople],
  )

  const hasError = leaderlessGroups.length > 0 || missingCCBIds.length > 0

  return (
    <Box padding={2}>
      <Stack spacing={2}>
        <TextField
          label="Campus"
          onChange={handleChangeCampus}
          select
          value={campus}
        >
          {CAMPUS_OPTIONS.map(opt => (
            <MenuItem key={opt} value={opt}>{opt}</MenuItem>
          ))}
        </TextField>

        <TextField
          label="Department"
          onChange={handleChangeDepartment}
          select
          value={department}
        >
          {DEPARTMENT_OPTIONS.map(opt => (
            <MenuItem key={opt} value={opt}>{opt}</MenuItem>
          ))}
        </TextField>

        <TextField
          label="CCB Group Type"
          onChange={handleChangeGroupType}
          select
          value={ccbGroupType}
        >
          {GROUP_TYPE_OPTIONS.map(opt => (
            <MenuItem key={opt} value={opt}>{opt}</MenuItem>
          ))}
        </TextField>

        <TextField
          label="Term"
          onChange={handleChangeTerm}
          select
          value={term}
        >
          <MenuItem value="T1">Term 1</MenuItem>
          <MenuItem value="T2">Term 2</MenuItem>
          <MenuItem value="T3">Term 3</MenuItem>
        </TextField>

        <TextField
          label="Faculty Abbreviation"
          disabled={groupType !== 'Bible Study'}
          onChange={handleChangeFaculty}
          value={groupType !== 'Bible Study' ? '' : faculty}
        />

        {stillWantAGroup.length > 0 && (
          <Alert severity="warning">
            <Typography paragraph>
              <strong>{stillWantAGroup.length}</strong>
              {' '}
              {stillWantAGroup.length === 1 ? 'person' : 'people'}
              {' '}
              {stillWantAGroup.length === 1 ? 'wants' : 'want'}
              {' '}
              to join a group but
              {' '}
              {stillWantAGroup.length === 1 ? 'is' : 'are'}
              {' '}
              not in a group:
            </Typography>
            {stillWantAGroup.map(p => (
              <Typography key={p.responseId}>
                {p.firstName} {p.lastName}
              </Typography>
            ))}
          </Alert>
        )}

        {largeGroups.length > 0 && (
          <Alert severity="warning">
            <Typography paragraph>
              <strong>{largeGroups.length}</strong>
              {' '}
              {largeGroups.length === 1 ? 'group' : 'groups'}
              {' '}
              {largeGroups.length === 1 ? 'has' : 'have'}
              {' '}
              more than <strong>10</strong> members:
            </Typography>
            <Typography>
              {largeGroups.map(g => (
                <span key={g.id} style={{ display: 'block' }}>
                  {prettyTimeString(g.time.time)}
                  {' '}
                  <strong>({g.members.length} members)</strong>
                </span>
              ))}
            </Typography>
          </Alert>
        )}

        {badGenderBalanceGroups.length > 0 && (
          <Alert severity="warning">
            <Typography paragraph>
              <strong>{badGenderBalanceGroups.length}</strong>
              {' '}
              {badGenderBalanceGroups.length === 1 ? 'group' : 'groups'}
              {' '}
              {badGenderBalanceGroups.length === 1 ? 'has' : 'have'}
              {' '}
              only one male or female member
            </Typography>
            <Typography>
              {badGenderBalanceGroups.map(g => (
                <span key={g.id} style={{ display: 'block' }}>
                  {prettyTimeString(g.time.time)}
                </span>
              ))}
            </Typography>
          </Alert>
        )}

        {leaderlessGroups.length > 0 && (
          <Alert severity="error">
            <Typography paragraph>
              <strong>{leaderlessGroups.length}</strong>
              {' '}
              {leaderlessGroups.length === 1 ? 'group' : 'groups'}
              {' '}
              {leaderlessGroups.length === 1 ? 'has' : 'have'}
              {' '}
              no leaders:
            </Typography>
            <Typography paragraph>
              {leaderlessGroups.map(g => (
                <span key={g.id} style={{ display: 'block' }}>
                  {prettyTimeString(g.time.time)}
                </span>
              ))}
            </Typography>
            <Typography>
              Please add at least one leader to every group before proceeding
            </Typography>
          </Alert>
        )}

        {missingCCBIds.length > 0 && (
          <Alert severity="error">
            <Typography paragraph>
              <strong>{missingCCBIds.length}</strong>
              {' '}
              {missingCCBIds.length === 1 ? 'person' : 'people'}
              {' '}
              {missingCCBIds.length === 1 ? 'has' : 'have'}
              {' '}
              no CCB ID set:
            </Typography>
            <Typography paragraph>
              {missingCCBIds.map(p => (
                <span key={p.responseId} style={{ display: 'block' }}>
                  {`${p.firstName} ${p.lastName}`}
                </span>
              ))}
            </Typography>
            <Typography>
              Please ensure you add an ID for everyone before proceeding
            </Typography>
          </Alert>
        )}

        <Button
          disabled={hasError}
          endIcon={<CheckIcon />}
          onClick={handleClickCreate}
          size="large"
          variant="contained"
        >
          Create or update CCB Groups
        </Button>

        {dataSentToCreate.length + removeIdsCache.length > 0 && (
          <CreateGroupsProgress
            toRemove={removeIdsCache}
            groups={dataSentToCreate}
            refreshCounter={refreshCounter}
          />
        )}

        <ConfirmationDialog
          onCancel={handleClickCancelCreate}
          onConfirm={handleConfirmCreate}
          open={showConfirm}
        >
          <p>Are you sure you&apos;d like to push these changes to CCB?</p>

          <p>
            This will add <strong>{ccbGroupStats.add}</strong>
            {ccbGroupStats.add === 1 ? ' group' : ' groups'},
            update <strong>{ccbGroupStats.update}</strong>
            {ccbGroupStats.update === 1 ? ' group' : ' groups'},
            and inactivate <strong>{ccbGroupStats.remove}</strong>
            {ccbGroupStats.remove === 1 ? ' group' : ' groups'}.
          </p>

          <Typography variant="caption">
            Note: if this tool would add a group but one already exists on CCB with
            the same name, then that group will be updated instead.
          </Typography>
        </ConfirmationDialog>
      </Stack>
    </Box>
  )
}

export default GroupsPage
