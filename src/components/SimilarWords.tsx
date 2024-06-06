import {
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Stack,
  Typography,
} from '@mui/material'
import styled from '@emotion/styled'
import {
  getAllValidParsings,
  parsingToString,
  removeInitialDagesh,
} from '../util'
import { getLinkedOccurrences, type LinkedOccurrence } from '../loadData'

const HighlightedSpan = styled('span')({
  color: 'blue',
})
const HebrewSpan = styled('span')({
  fontSize: '110%',
  fontFamily: "'Ezra SIL', Roboto, David, sans-serif",
})

function SimilarWords({
  occurrence,
}: {
  occurrence: LinkedOccurrence,
}) {
  const [occurrences, setOccurrences] = useState<LinkedOccurrence[]>([])
  useEffect(
    () => {
      getLinkedOccurrences().then(setOccurrences)
    },
    [],
  )

  const validParsings = useMemo(
    () => getAllValidParsings(occurrence, occurrences),
    [occurrences, occurrence],
  )
  const alternativeSpellings = useMemo(
    () => {
      const withOtherSpellings = occurrences.filter(
        o => (
          o.root.root === occurrence.root.root
          && o.parsings.some(p => (
            occurrence.parsings.some(p2 => (
              p.stem === p2.stem
              && p.tense === p2.tense
              && p.pgn.person === p2.pgn.person
              && p.pgn.gender === p2.pgn.gender
              && p.pgn.number === p2.pgn.number
              && p.suffix.person === p2.suffix.person
              && p.suffix.gender === p2.suffix.gender
              && p.suffix.number === p2.suffix.number
            ))
          ))
        )
      )
      const counts = withOtherSpellings.reduce(
        (acc, o) => {
          const verb = removeInitialDagesh(o.verb.verb)
          acc.set(verb, (acc.get(verb) || 0) + 1)
          return acc
        },
        new Map<string, number>(),
      )
      return Array.from(counts.entries()).sort(([, v1], [, v2]) => v2 - v1)
    },
    [occurrences, occurrence],
  )

  return (
    <>
      <Accordion>
        <AccordionSummary disabled={validParsings.length === 1}>
          <Typography variant="h6">
            {validParsings.length === 1 ? 'No other' : validParsings.length}
            {' '}
            parsings for this word
          </Typography>
        </AccordionSummary>

        <AccordionDetails>
          <Stack spacing={2}>
            {validParsings.map(([p, count], i) => (
              <Typography
                key={i}
                variant="h5"
              >
                {count}
                {'x '}
                <Typography
                  color={occurrence.parsings.includes(p) ? 'blue' : undefined}
                  component="span"
                  variant="inherit"
                >
                  {parsingToString(p)}
                </Typography>
              </Typography>
            ))}
          </Stack>
        </AccordionDetails>
      </Accordion>

      <Accordion>
        <AccordionSummary disabled={alternativeSpellings.length === 1}>
          <Typography variant="h6">
            {alternativeSpellings.length === 1 ? 'No' : alternativeSpellings.length - 1}
            {' '}
            alternative spellings
          </Typography>
        </AccordionSummary>

        <AccordionDetails>
          <Stack spacing={2}>
            {alternativeSpellings.map(([spelling, count], i) => (
              <Typography
                key={i}
                variant="h5"
              >
                {count}
                {'x '}
                <HebrewSpan>
                  {spelling === occurrence.verb.verb ? (
                    <HighlightedSpan>
                      {spelling}
                    </HighlightedSpan>
                  ) : (
                    spelling
                  )}
                </HebrewSpan>
              </Typography>
            ))}
          </Stack>
        </AccordionDetails>
      </Accordion>
    </>
  )
}

export default SimilarWords
