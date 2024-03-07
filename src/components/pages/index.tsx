import { ReactNode, useEffect, useMemo, useState } from 'react'
import { Route, Routes } from 'react-router-dom'
import { DataIcon, GroupsIcon, CheckIcon, MuiIconType } from '../Icons'
import GroupsPage from './Groups'
import DataPage from './Data'
import FinishPage from './Finish'
import LoginPage from './Login'
import { useAppSelector } from '../../store'
import sync from '../../sync/sync'

export type PageId = (
  'data' |
  'groups' |
  'finish'
)

export interface Page {
  id: PageId,
  name: string,
  icon: MuiIconType,
  path: string,
  page: ReactNode,
}

export const pages: Page[] = [
  {
    id: 'data',
    path: '/',
    name: 'Data',
    icon: DataIcon,
    page: <DataPage />,
  },
  {
    id: 'groups',
    path: '/groups',
    name: 'Groups',
    icon: GroupsIcon,
    page: <GroupsPage />,
  },
  {
    id: 'finish',
    path: '/finish',
    name: 'Finish',
    icon: CheckIcon,
    page: <FinishPage />,
  },
]

const allPages = pages.slice().reverse()

function PageView() {
  const loggedIn = useAppSelector(state => !!state.ui.apiPassword)
  const [connected, setConnected] = useState(false)
  useEffect(
    () => {
      const interval = window.setInterval(
        () => {
          setConnected(sync.connected)
        },
        200,
      )
      return () => window.clearInterval(interval)
    },
    [],
  )

  const pageRoutes = useMemo(
    () => allPages.map(page => (
      <Route
        key={page.id}
        path={page.path}
        element={page.page}
      />
    )),
    [],
  )

  return (
    <Routes>
      {!loggedIn && (
        <Route path="/" element={<LoginPage />} />
      )}
      {!connected && (
        <Route path="/" element={<DataPage />} />
      )}

      {pageRoutes}
    </Routes>
  )
}

export default PageView

export function getPage(page: PageId) {
  const result = allPages.find(p => p.id === page)
  if (result === undefined) {
    throw new Error(`Unknown page id ${page}`)
  }
  return result
}
