import {
  Fragment,
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
  countParsings,
  extractVowels,
  getAllValidParsings,
  isSimilarRoot,
  parsingToString,
  removeInitialDagesh,
} from '../util'
import { getLinkedOccurrences, type LinkedOccurrence } from '../loadData'


const MIN_SIMILAR_WORD_PARSINGS_COUNT = 5

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
  const parsingsWithCounts = useMemo(
    () => countParsings(validParsings),
    [validParsings],
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
    [occurrence, occurrences],
  )
  const similarWords = useMemo(
    () => occurrences.filter(
      o => (
        o.root.root !== occurrence.root.root
        && isSimilarRoot(o.root.root, occurrence.root.root)
        && extractVowels(o.verb.verb) === extractVowels(occurrence.verb.verb)
      ),
    ),
    [occurrence, occurrences],
  )
  const alternativeParsingsInSimilarWords = useMemo(
    () => (
      countParsings(
        similarWords.flatMap(o => o.parsings).filter(p => (
          !validParsings.includes(p)
        ))
      ).filter(
        ([, count]) => count > MIN_SIMILAR_WORD_PARSINGS_COUNT
      )
    ),
    [similarWords, validParsings],
  )

  return (
    <Fragment>
      <Accordion>
        <AccordionSummary disabled={parsingsWithCounts.length === 1}>
          <Typography variant="h6">
            {parsingsWithCounts.length === 1 ? 'No other' : parsingsWithCounts.length}
            {' '}
            parsings for this word
          </Typography>
        </AccordionSummary>

        <AccordionDetails>
          <Stack spacing={2}>
            {parsingsWithCounts.map(([p, count], i) => (
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

      <Accordion>
        <AccordionSummary disabled={alternativeParsingsInSimilarWords.length === 0}>
          <Typography variant="h6">
            {
              alternativeParsingsInSimilarWords.length === 0
                ? 'No'
                : alternativeParsingsInSimilarWords.length
            }
            {' '}
            alternative parsings in different words with similar vowel patterns
          </Typography>
        </AccordionSummary>

        <AccordionDetails>
          <Stack spacing={2}>
            {alternativeParsingsInSimilarWords.map(([p, count], i) => (
              <Typography
                key={i}
                variant="h5"
              >
                {count}
                {'x '}

                <Typography
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
    </Fragment>
  )
}

export default SimilarWords
