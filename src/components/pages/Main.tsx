import {
  Box,
  Button,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import { useAppDispatch, useAppSelector } from '../../store'
import { ALL_PARTS, PART_MAPPING, getPartName } from './util'
import { trpc } from '../../trpc'
import type { FilterCondition } from '../../../lambda/filter'

function MainPage() {
  const dispatch = useAppDispatch()

  const filterConditions: FilterCondition = {
    '1-gutteral': true,
    '1-aleph': true,
    '1-nun': true,
    '1-waw': true,
    '1-yod': true,
    '2-gutteral': true,
    '3-heh': true,
    '3-aleph': true,
    hollow: true,
    geminate: true,
    suffixes: true,
    minFrequency: 0,
  }

  const currentWord = trpc.getWord.useQuery({ filterConditions })

  return (
    <Box
      padding={2}
      justifyContent="center"
      display="flex"
    >
      <Stack spacing={2} maxWidth={800}>
        <Typography
          variant="h2"
          textAlign="center"
          fontFamily={"'Ezra SIL', Roboto, David, sans-serif"}
          py={2}
        >
          {currentWord.data?.verb.verb || null}
        </Typography>

        {/* {ALL_PARTS.map(part => (
          <ToggleButtonGroup
            key={part}
            onChange={handleTogglePart(part)}
            exclusive
            value={parsingInfo[part]}
            disabled={!applicableParts.includes(part)}
          >
            {PART_MAPPING[part].map(value => (
              <ToggleButton
                key={value}
                value={value}
                selected={applicableParts.includes(part) && parsingInfo[part] === value}
              >
                {getPartName(part, value)}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        ))}

        <Button
          onClick={handleClickCheck}
          color="primary"
          variant="contained"
          disabled={(
            applicableParts.findIndex(part => parsingInfo[part] === null) >= 0
            && isValidParsing(parsingInfo)
          )}
        >
          Check
        </Button> */}
      </Stack>
    </Box>
  )
}

export default MainPage
