import {
  CircularProgress,
  LinearProgress,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
} from '@mui/material'
import { amber, green, red } from '@mui/material/colors'
import { Fragment, useCallback, useEffect, useState } from 'react'
import { CreateGroupData, ProgressCallback } from '../../lambda/types'
import sync from '../sync/sync'
import { CheckIcon, CloseIcon } from './Icons'

type Props = {
  groups: CreateGroupData[],
  refreshCounter: number,
  toRemove: number[],
}

function CreateGroupsProgress({
  groups,
  refreshCounter,
  toRemove,
}: Props) {
  return (
    <List>
      {toRemove.length > 0 && (
        <SingleGroupProgress
          group={null}
          key={`remove~${refreshCounter}`}
          toRemove={toRemove}
        />
      )}

      {groups.map(group => (
        <SingleGroupProgress
          group={group}
          key={`${group.name}~${refreshCounter}`}
        />
      ))}
    </List>
  )
}

function SingleGroupProgress({
  group,
  toRemove,
}: {
  group: CreateGroupData | null,
  toRemove?: number[],
}) {
  const [started, setStarted] = useState(false)
  const [failed, setFailed] = useState(false)
  const [warned, setWarned] = useState(false)
  const [messages, setMessages] = useState<string[]>([])
  const [progress, setProgress] = useState(0)
  const [totalProgress, setTotalProgress] = useState(
    group ? group.members.length + 4 : (toRemove?.length ?? 0),
  )

  const incrementProgress = useCallback(
    () => setProgress(p => p + 1),
    [],
  )

  useEffect(
    () => {
      if (group) {
        const existsCallback: ProgressCallback = data => {
          incrementProgress()
          setMessages(m => (data.message ? [...m, data.message] : m))
        }
        sync.addProgressListener(group.name, 'exists', existsCallback)

        const progressCallback: ProgressCallback = () => incrementProgress()
        sync.addProgressListener(group.name, 'group', progressCallback)
        sync.addProgressListener(group.name, 'event', progressCallback)
        sync.addProgressListener(group.name, 'member', progressCallback)
        sync.addProgressListener(group.name, 'leaders', progressCallback)

        const removeCallback: ProgressCallback = data => {
          incrementProgress()
          setTotalProgress(t => t + 1)
          setMessages(m => (data.message ? [...m, data.message] : m))
        }
        sync.addProgressListener(group.name, 'remove-member', removeCallback)

        const completedCallback: ProgressCallback = () => setProgress(totalProgress)
        sync.addProgressListener(group.name, 'completed', completedCallback)

        const skippedCallback: ProgressCallback = () => setProgress(-1)
        sync.addProgressListener(group.name, 'skipped', skippedCallback)

        const failedCallback: ProgressCallback = data => {
          setFailed(true)
          setMessages(m => (data.message ? [...m, data.message] : m))
        }
        sync.addProgressListener(group.name, 'failed', failedCallback)

        const warningCallback: ProgressCallback = data => {
          setWarned(true)
          setMessages(m => (data.message ? [...m, data.message] : m))
        }
        sync.addProgressListener(group.name, 'warning', warningCallback)

        const startedCallback: ProgressCallback = () => {
          setStarted(true)
          setFailed(false)
          setWarned(false)
          setMessages([])
          setProgress(0)
          setTotalProgress(group.members.length + 4)
        }
        sync.addProgressListener(group.name, 'started', startedCallback)

        return () => {
          sync.removeProgressListener(group.name, 'exists', existsCallback)
          sync.removeProgressListener(group.name, 'group', progressCallback)
          sync.removeProgressListener(group.name, 'event', progressCallback)
          sync.removeProgressListener(group.name, 'member', progressCallback)
          sync.removeProgressListener(group.name, 'leaders', progressCallback)
          sync.removeProgressListener(group.name, 'remove-member', removeCallback)
          sync.removeProgressListener(group.name, 'completed', completedCallback)
          sync.removeProgressListener(group.name, 'skipped', skippedCallback)
          sync.removeProgressListener(group.name, 'failed', failedCallback)
          sync.removeProgressListener(group.name, 'warning', warningCallback)
          sync.removeProgressListener(group.name, 'started', startedCallback)
        }
      } else if (toRemove) {
        const inactivatedCallback: ProgressCallback = () => {
          setStarted(true)
          incrementProgress()
        }
        const failedCallback: ProgressCallback = data => {
          setFailed(true)
          setMessages(m => (data.message ? [...m, data.message] : m))
        }
        for (const id of toRemove) {
          sync.addProgressListener(`remove-${id}`, 'inactivated', inactivatedCallback)

          sync.addProgressListener(`remove-${id}`, 'failed', failedCallback)
        }

        return () => {
          for (const id of toRemove) {
            sync.removeProgressListener(`remove-${id}`, 'inactivated', inactivatedCallback)
            sync.removeProgressListener(`remove-${id}`, 'failed', failedCallback)
          }
        }
      }
    },
    [group, incrementProgress, totalProgress, toRemove],
  )

  let backgroundColor: string | undefined
  if (failed) {
    backgroundColor = red[100]
  } else if (warned) {
    backgroundColor = amber[100]
  } else if (progress >= totalProgress) {
    backgroundColor = green[100]
  }

  return (
    <div>
      <ListItem
        sx={{ backgroundColor }}
      >
        <ListItemAvatar>
          {failed ? (
            <CloseIcon color="error" />
          ) : (
            started && (
              progress >= 0 && progress < totalProgress ? (
                <CircularProgress
                  color={warned ? 'warning' : 'info'}
                  variant="indeterminate"
                  size={24}
                />
              ) : (
                <CheckIcon
                  color={progress === -1 || warned ? 'warning' : 'success'}
                />
              )
            )
          )}
        </ListItemAvatar>

        <ListItemText
          primary={group ? group.name : 'Inactivating old groups'}
          secondary={messages.map(message => (
            <Fragment key={message}>
              <span>{message}</span>
              <br />
            </Fragment>
          ))}
        />
      </ListItem>

      {started && progress >= 0 && progress < totalProgress && (
        <LinearProgress
          variant="determinate"
          value={Math.round((progress / totalProgress) * 100)}
          sx={{ height: 2, mt: -0.25 }}
        />
      )}
    </div>
  )
}

export default CreateGroupsProgress
