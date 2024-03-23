import {
  MenuItem,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material'
import type { FilterCondition } from '../../lambda/filter'
import { ChangeEvent, useCallback, useMemo } from 'react'
import { ALL_STEMS, getTenseName } from '../util'
import { Tense } from '../../lambda/data'

const allRoots = [
  '1-gutteral',
  '1-aleph',
  '1-nun',
  '1-waw',
  '1-yod',
  '2-gutteral',
  '3-heh',
  '3-aleph',
  'hollow',
  'geminate',
] as const
const baseRoots = (
  Object.fromEntries(allRoots.map(root => [root, false]))
) as FilterCondition['root']

const allStems = ALL_STEMS.map(stem => stem.toLowerCase() as keyof FilterCondition['stem'])
const baseStems = (
  Object.fromEntries(allStems.map(stem => [stem, false]))
) as FilterCondition['stem']

const allTenses = [
  'qatal',
  'yiqtol',
  'wayyiqtol',
  'imperative',
  'activeParticiple',
  'passiveParticiple',
  'infinitiveConstruct',
  'infinitiveAbsolute',
] as const
const tenseNameLookup: Record<keyof FilterCondition['tense'], Tense> = {
  qatal: 'Qatal',
  yiqtol: 'Yiqtol',
  wayyiqtol: 'Wayyiqtol',
  imperative: 'Imperative',
  activeParticiple: 'Active participle',
  passiveParticiple: 'Passive participle',
  infinitiveConstruct: 'Infinitive construct',
  infinitiveAbsolute: 'Infinitive absolute',
}
const baseTenses = (
  Object.fromEntries(allTenses.map(tense => [tense, false]))
) as FilterCondition['tense']

const minFrequencyOptions = [
  0,
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
        .map(([key]) => key)
    ),
    [filterConditions.root],
  )
  const handleChangeRoots = useCallback(
    (event: React.MouseEvent<HTMLElement>, newRoots: (keyof FilterCondition['root'])[]) => {
      const rootMap = newRoots.reduce(
        (acc, root) => ({ ...acc, [root]: true }),
        { ...baseRoots },
      )
      onChange({
        ...filterConditions,
        root: rootMap,
      })
    },
    [filterConditions],
  )

  const selectedStems = useMemo(
    () => (
      Object.entries(filterConditions.stem)
        .filter(([, value]) => value)
        .map(([key]) => key)
    ),
    [filterConditions.stem],
  )
  const handleChangeStems = useCallback(
    (event: React.MouseEvent<HTMLElement>, newStems: (keyof FilterCondition['stem'])[]) => {
      const stemMap = newStems.reduce(
        (acc, stem) => ({ ...acc, [stem]: true }),
        { ...baseStems },
      )
      onChange({
        ...filterConditions,
        stem: stemMap,
      })
    },
    [filterConditions],
  )

  const selectedTenses = useMemo(
    () => (
      Object.entries(filterConditions.tense)
        .filter(([, value]) => value)
        .map(([key]) => key)
    ),
    [filterConditions.tense],
  )
  const handleChangeTenses = useCallback(
    (event: React.MouseEvent<HTMLElement>, newTenses: (keyof FilterCondition['tense'])[]) => {
      const tenseMap = newTenses.reduce(
        (acc, tense) => ({ ...acc, [tense]: true }),
        { ...baseTenses },
      )
      onChange({
        ...filterConditions,
        tense: tenseMap,
      })
    },
    [filterConditions],
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
    [filterConditions],
  )

  const handleChangeFrequency = useCallback(
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      onChange({
        ...filterConditions,
        minFrequency: Number.parseInt(event.target.value, 10),
      })
    },
    [filterConditions],
  )

  return (
    <Stack spacing={2}>
      <ToggleButtonGroup
        fullWidth
        onChange={handleChangeRoots}
        value={selectedRoots}
      >
        {allRoots.map(root => (
          <ToggleButton
            key={root}
            value={root}
          >
            {root}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>

      <ToggleButtonGroup
        fullWidth
        onChange={handleChangeStems}
        value={selectedStems}
      >
        {allStems.map(stem => (
          <ToggleButton
            key={stem}
            value={stem}
          >
            {stem}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>

      <ToggleButtonGroup
        fullWidth
        value={selectedTenses}
        onChange={handleChangeTenses}
      >
        {allTenses.map(tense => (
          <ToggleButton
            key={tense}
            value={tense}
          >
            {getTenseName(tenseNameLookup[tense])}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>

      <ToggleButtonGroup fullWidth>
        <ToggleButton
          value="include"
          selected={filterConditions.suffixes.include}
          onChange={handleChangeSuffixes}
        >
          Include pronominal suffixes
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
          Only include words with suffixes
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