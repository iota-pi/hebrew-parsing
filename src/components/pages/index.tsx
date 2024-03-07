import { ReactNode, useEffect, useMemo, useState } from 'react'
import { Route, Routes } from 'react-router-dom'
import MainPage from './Main'
import { useAppSelector } from '../../store'

export type PageId = (
  | 'main'
)

export interface Page {
  id: PageId,
  name: string,
  path: string,
  page: ReactNode,
}

export const pages: Page[] = [
  {
    id: 'main',
    path: '/',
    name: 'Main',
    page: <MainPage />,
  },
]

const allPages = pages.slice().reverse()

function PageView() {
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
