import {
  MenuItem,
  Stack,
  TextField,
  Theme,
  ToggleButton,
  ToggleButtonGroup,
  useMediaQuery,
} from '@mui/material'
import type { FilterCondition, RootKey, Stem, Tense } from '../../lambda/filter'
import { ChangeEvent, useCallback, useMemo } from 'react'
import { ALL_STEMS, ALL_TENSES, getRootTypeName, getTenseName } from '../util'
import FilterSelect from './FilterSelect'
import { useDebounceCallback } from 'usehooks-ts'

const allRoots = [
  'strong',
  '1-gutteral',
  '1-aleph',
  '1-nun',
  '1-waw',
  '2-gutteral',
  '3-heh',
  '3-aleph',
  'hollow',
  'geminate',
] satisfies (keyof FilterCondition['root'])[]
const baseRoots = (
  Object.fromEntries(allRoots.map(root => [root, false]))
) as FilterCondition['root']

const baseStems = (
  Object.fromEntries(ALL_STEMS.map(stem => [stem, false]))
) as FilterCondition['stem']

const baseTenses = (
  Object.fromEntries(ALL_TENSES.map(tense => [tense, false]))
) as FilterCondition['tense']

const minFrequencyOptions = [
  // 0,
  10,
  50,
  100,
]

function FilterSelection({
  filterConditions,
  onChange,
}: {
  filterConditions: FilterCondition,
  onChange: (newFilterConditions: FilterCondition) => void,
}) {
  const selectedRoots = useMemo(
    () => (
      Object.entries(filterConditions.root)
        .filter(([, value]) => value)
        .map(([key]) => key as RootKey)
    ),
    [filterConditions.root],
  )
  const handleChangeRoots = useDebounceCallback(
    (newRoots: RootKey[]) => {
      const rootMap = newRoots.reduce(
        (acc, root) => ({ ...acc, [root]: true }),
        { ...baseRoots },
      )
      onChange({
        ...filterConditions,
        root: rootMap,
      })
    },
    100,
    { leading: true, trailing: false },
  )

  const selectedStems = useMemo(
    () => (
      Object.entries(filterConditions.stem)
        .filter(([, value]) => value)
        .map(([key]) => key as Stem)
    ),
    [filterConditions.stem],
  )
  const handleChangeStems = useDebounceCallback(
    (newStems: Stem[]) => {
      const stemMap = newStems.reduce(
        (acc, stem) => ({ ...acc, [stem]: true }),
        { ...baseStems },
      )
      onChange({
        ...filterConditions,
        stem: stemMap,
      })
    },
    100,
    { leading: true, trailing: false },
  )

  const selectedTenses = useMemo(
    () => (
      Object.entries(filterConditions.tense)
        .filter(([, value]) => value)
        .map(([key]) => key as Tense)
    ),
    [filterConditions.tense],
  )
  const handleChangeTenses = useDebounceCallback(
    (newTenses: Tense[]) => {
      const tenseMap = newTenses.reduce(
        (acc, tense) => ({ ...acc, [tense]: true }),
        { ...baseTenses },
      )
      onChange({
        ...filterConditions,
        tense: tenseMap,
      })
    },
    100,
    { leading: true, trailing: false },
  )

  const handleChangeSuffixes = useCallback(
    (event: React.MouseEvent, value: keyof FilterCondition['suffixes']) => {
      onChange({
        ...filterConditions,
        suffixes: {
          ...filterConditions.suffixes,
          [value]: !filterConditions.suffixes[value],
        },
      })
    },
    [filterConditions, onChange],
  )

  const handleChangeFrequency = useCallback(
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      onChange({
        ...filterConditions,
        minFrequency: Number.parseInt(event.target.value, 10),
      })
    },
    [filterConditions, onChange],
  )

  const xs = useMediaQuery<Theme>(theme => theme.breakpoints.only('xs'))

  return (
    <Stack spacing={2}>
      <FilterSelect
        value={selectedRoots}
        options={allRoots}
        label="Include roots:"
        onChange={handleChangeRoots}
        getOptionLabel={root => (
          root === '1-waw'
            ? '1-waw / 1-yod'
            : getRootTypeName(root)
        )}
      />

      <FilterSelect
        value={selectedStems}
        options={ALL_STEMS}
        label="Include stems:"
        onChange={handleChangeStems}
      />

      <FilterSelect
        value={selectedTenses}
        options={ALL_TENSES}
        label="Include tenses:"
        onChange={handleChangeTenses}
        getOptionLabel={getTenseName}
      />

      <ToggleButtonGroup fullWidth>
        <ToggleButton
          value="include"
          selected={filterConditions.suffixes.include}
          onChange={handleChangeSuffixes}
        >
          Include suffixes
        </ToggleButton>
        <ToggleButton
          value="exclusive"
          selected={
            filterConditions.suffixes.include
            && filterConditions.suffixes.exclusive
          }
          onChange={handleChangeSuffixes}
          disabled={!filterConditions.suffixes.include}
        >
          {xs ? 'Only with' : 'Always include'} suffixes
        </ToggleButton>
      </ToggleButtonGroup>

      <TextField
        label="Include roots which occur:"
        select
        value={filterConditions.minFrequency.toString()}
        onChange={handleChangeFrequency}
      >
        {minFrequencyOptions.map(frequency => (
          <MenuItem
            key={frequency}
            value={frequency.toString()}
          >
            {frequency === 0 ? (
              'At least once'
            ) : (
              `${frequency}+ times`
            )}
          </MenuItem>
        ))}
      </TextField>
    </Stack>
  )
}

export default FilterSelection
