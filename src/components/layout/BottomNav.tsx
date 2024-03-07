import { SyntheticEvent, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  BottomNavigation,
  BottomNavigationAction,
} from '@mui/material'
import { PageId, pages } from '../pages'
import { useAppSelector } from '../../store'
import { useAllFaculties, usePeople } from '../../state/selectors'


function BottomNav() {
  const allFaculties = useAllFaculties()
  const navigate = useNavigate()
  const location = useLocation()
  const people = usePeople()
  const selectedFaculties = useAppSelector(state => state.faculties)
  const groupType = useAppSelector(state => state.groupType)

  const currentPageId = pages.find(p => p.path === location.pathname)?.id
  const handleChange = useCallback(
    (event: SyntheticEvent, pageId: string) => {
      if (currentPageId !== pageId) {
        const page = pages.find(p => p.id === pageId)!
        navigate(page.path)
      }
    },
    [currentPageId, navigate],
  )

  const getDisabled = useCallback(
    (pageId: PageId) => pageId !== 'data' && (
      people.length === 0 || (
        allFaculties.length > 0 && selectedFaculties.length === 0 && groupType === 'Bible Study'
      )
    ),
    [allFaculties.length, groupType, people.length, selectedFaculties.length],
  )

  return (
    <BottomNavigation
      showLabels
      value={currentPageId}
      onChange={handleChange}
    >
      {pages.map(({ id, name, icon: Icon }) => (
        <BottomNavigationAction
          disabled={getDisabled(id)}
          icon={<Icon />}
          key={id}
          label={name}
          sx={{ opacity: getDisabled(id) ? 0.7 : undefined }}
          value={id}
        />
      ))}
    </BottomNavigation>
  )
}

export default BottomNav
