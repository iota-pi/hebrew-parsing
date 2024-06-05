import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Button,
  Stack,
  Typography,
} from '@mui/material'
import styled from '@emotion/styled'
import { grey } from '@mui/material/colors'
import {
  ALL_PARTS,
  Parsing,
  ParsingKey,
  getReferenceString,
  stripAccents,
  ApplicableParts,
  isSimplePart,
  isValidPGN,
  isValidSuffix,
  getStemName,
  getTenseName,
  getPGNKey,
  hasSetPGN,
  toLogosLink,
  parsingToString,
} from '../util'
import { VerbParsing, getLinkedOccurrences, type LinkedOccurrence } from '../loadData'
import type { FilterCondition, Stem, Tense } from '../filter'
import ParsingControlGroup from './ParsingControlGroup'
import PGNGroup from './PGNGroup'
import SuffixSelection, { Suffix } from './SuffixSelection'

const MAIN_PARTS = ALL_PARTS.filter(part => part !== 'suffix')
const DEFAULT_SUFFIX: Suffix = 'no-suffix'
const PARSING_SOURCE_NAMES = ['BHS', 'OSM']

const FadedSpan = styled('span')({
  color: grey[800],
})
const HighlightedSpan = styled('span')({
  color: 'blue',
})
const HebrewSpan = styled('span')({
  fontSize: '110%',
  fontFamily: "'Ezra SIL', Roboto, David, sans-serif",
})

function VerbParsingComponent({
  filterOptions,
  occurrence,
  onAnswer,
  onNext,
  onGiveAgain,
}: {
  filterOptions: FilterCondition,
  occurrence: LinkedOccurrence,
  onAnswer: () => void,
  onNext: () => void,
  onGiveAgain: () => void,
}) {
  const [occurrences, setOccurrences] = useState<LinkedOccurrence[]>([])
  useEffect(
    () => {
      getLinkedOccurrences().then(setOccurrences)
    },
    [],
  )

  const [stems, tenses] = useMemo(
    () => {
      const stems = (
        Object.entries(
          filterOptions.stem
        ).filter(([, v]) => v).map(([k]) => k as Stem)
      )
      const tenses = (
        Object.entries(
          filterOptions.tense
        ).filter(([, v]) => v).map(([k]) => k as Tense)
      )
      return [stems, tenses]
    },
    [filterOptions.stem, filterOptions.tense],
  )

  const [parsing, setParsing] = useState(getInitialParsing(stems, tenses))
  const [suffix, setSuffix] = useState<Suffix>(DEFAULT_SUFFIX)
  const [showAnswer, setShowAnswer] = useState(false)

  useEffect(
    () => {
      let newStem: Stem | undefined = undefined
      let newTense: Tense | undefined = undefined
      if (stems.length === 1) {
        newStem = stems[0]
      }
      if (tenses.length === 1) {
        newTense = tenses[0]
      }
      if (newStem || newTense) {
        setParsing(prev => ({
          ...prev,
          stem: newStem || prev.stem,
          tense: newTense || prev.tense,
        }))
      }
    },
    [stems, tenses],
  )

  const canHaveSuffixes = filterOptions.suffixes.include
  const mustHaveSuffixes = (
    filterOptions.suffixes.include
    && filterOptions.suffixes.exclusive
  )
  useEffect(
    () => {
      if (!canHaveSuffixes) {
        setSuffix('no-suffix')
      } else if (mustHaveSuffixes) {
        setSuffix('suffix')
      }
    },
    [canHaveSuffixes, mustHaveSuffixes],
  )

  const applicableParts = useMemo(
    () => {
      const parts: ApplicableParts = getInitialApplicableParts()

      if (
        parsing.tense === 'Infinitive construct'
        || parsing.tense === 'Infinitive absolute'
      ) {
        parts.pgn.person = false
        parts.pgn.gender = false
        parts.pgn.number = false
      }

      if (suffix === 'no-suffix') {
        parts.suffix = false
      }

      if (
        parsing.stem
        && parsing.stem !== 'Qal'
        && parsing.stem !== 'N/A'
        && parts.tense
      ) {
        parts.tense['Passive participle'] = false
      }

      if (parts.stem) {
        for (const stem of Object.keys(parts.stem) as Stem[]) {
          parts.stem[stem] &&= filterOptions.stem[stem]
        }
      }

      if (parts.tense) {
        for (const tense of Object.keys(parts.tense) as Tense[]) {
          parts.tense[tense] &&= filterOptions.tense[tense]
        }
      }

      return parts
    },
    [filterOptions.stem, filterOptions.tense, parsing.stem, parsing.tense, suffix],
  )

  const isValid = useMemo(
    () => {
      for (const part of ALL_PARTS) {
        if (!applicableParts[part]) {
          continue
        }

        if (isSimplePart(part)) {
          if (parsing[part] === 'N/A') {
            return false
          }
        } else {
          if (part === 'pgn') {
            if (!isValidPGN(parsing[part], parsing)) {
              return false
            }
          } else {
            if (!isValidSuffix(parsing[part])) {
              return false
            }
          }
        }
      }

      return true
    },
    [parsing, applicableParts],
  )

  const validParsings = useMemo(
    () => {
      const allOccurrences = occurrences.filter(
        o => o.verb.verb === occurrence.verb.verb
      )
      // TODO: run a check to see if this is ever necessary;
      // if it is then the root should be displayed along with the parsing
      if (allOccurrences.some(o => o.root.root !== occurrence.root.root)) {
        console.warn('Root mismatch in other parsings')
      }

      const parsings = allOccurrences.flatMap(o => o.parsings)
      const counts = parsings.reduce(
        (acc, p) => {
          acc.set(p, (acc.get(p) || 0) + 1)
          return acc
        },
        new Map<VerbParsing, number>(),
      )
      return Array.from(counts.entries()).sort(([, v1], [, v2]) => v2 - v1)
    },
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
          acc.set(o.verb.verb, (acc.get(o.verb.verb) || 0) + 1)
          return acc
        },
        new Map<string, number>(),
      )
      return Array.from(counts.entries()).sort(([, v1], [, v2]) => v2 - v1)
    },
    [occurrences, occurrence],
  )

  const handleChange = useCallback(
    <T extends ParsingKey>(part: T) => (
      (newData: Parsing[T]) => {
        if (showAnswer) {
          return
        }

        if (newData) {
          setParsing(prev => ({
            ...prev,
            tense: (
              part === 'stem'
              && newData !== 'Qal'
              && prev.tense === 'Passive participle'
            ) ? 'Active participle' : prev.tense,
            [part]: newData,
          }))
        }
      }
    ),
    [showAnswer],
  )

  const handleToggleSuffix = useCallback(
    (suffix: Suffix) => {
      setSuffix(suffix)
    },
    [],
  )

  const checkAnswer = useCallback(
    () => {
      onAnswer()
      setShowAnswer(true)
    },
    [onAnswer],
  )

  const reset = useCallback(
    () => {
      setParsing(getInitialParsing(stems, tenses))
      setSuffix(
        mustHaveSuffixes
          ? 'suffix'
          : (
            canHaveSuffixes
              ? DEFAULT_SUFFIX
              : 'no-suffix'
          )
      )
      setShowAnswer(false)
    },
    [canHaveSuffixes, mustHaveSuffixes, stems, tenses],
  )
  const handleNext = useCallback(
    () => {
      reset()
      onNext()
    },
    [onNext, reset],
  )
  const handleGiveAgain = useCallback(
    () => {
      reset()
      onGiveAgain()
    },
    [onGiveAgain, reset],
  )

  const replacementCode = useMemo(
    () => new RegExp(
      '('
      + Array.from(occurrence.verb.verb).join(
        '[^\u05b0-\u05bc\u05c1\u05c2\u05c7-\u05ea]?'
      )
      + ')',
      'g',
    ),
    [occurrence.verb],
  )
  const verseParts = useMemo(
    () => occurrence.verse.text.split(replacementCode),
    [occurrence.verse, replacementCode],
  )
  const verseElement = useMemo(
    () => verseParts.map((part, index) => (
      <Fragment key={index}>
        {stripAccents(part) === occurrence.verb.verb ? (
          <HighlightedSpan>
            {part}
          </HighlightedSpan>
        ) : (
          part
        )}
      </Fragment>
    )),
    [verseParts, occurrence.verb],
  )

  return (
    <Stack spacing={2}>
      <div>
        <Typography
          variant="h4"
          fontFamily={"'Ezra SIL', Roboto, David, sans-serif"}
          lineHeight={1.5}
          textAlign={'right'}
          pt={1}
        >
          <FadedSpan>
            {verseElement}
          </FadedSpan>
        </Typography>

        <Typography
          variant="h6"
          textAlign={'right'}
          color='grey.600'
        >
          {getReferenceString(occurrence.verse, occurrence.book)}
        </Typography>

        <Typography
          variant="h2"
          textAlign="center"
          fontFamily={"'Ezra SIL', Roboto, David, sans-serif"}
          pb={2}
        >
          <HighlightedSpan>
            {stripAccents(occurrence.verb.verb)}
          </HighlightedSpan>
        </Typography>
      </div>

      <Stack direction="row" spacing={2} overflow="auto">
        {MAIN_PARTS.map(part => (
          isSimplePart(part) ? (
            <ParsingControlGroup
              applicable={applicableParts[part]}
              key={part}
              onChange={handleChange(part)}
              parsing={parsing}
              part={part}
              showAnswer={showAnswer}
              value={parsing[part]}
              occurrence={occurrence}
              correctParsings={validParsings}
            />
          ) : (
            <PGNGroup
              applicable={applicableParts[part]}
              key={part}
              onChange={handleChange(part)}
              parsing={parsing}
              part={part}
              showAnswer={showAnswer}
              value={parsing[part]}
              occurrence={occurrence}
              correctParsings={validParsings}
            />
          )
        ))}

        {canHaveSuffixes && (
          <>
            <SuffixSelection
              disabled={mustHaveSuffixes}
              onChange={handleToggleSuffix}
              showAnswer={showAnswer}
              suffix={suffix}
              occurrence={occurrence}
              correctParsings={validParsings}
            />

            <PGNGroup
              applicable={applicableParts.suffix}
              onChange={handleChange('suffix')}
              parsing={parsing}
              part="suffix"
              showAnswer={showAnswer}
              value={parsing.suffix}
              occurrence={occurrence}
              correctParsings={validParsings}
            />
          </>
        )}
      </Stack>

      <Button
        onClick={showAnswer ? handleNext : checkAnswer}
        color="primary"
        variant="contained"
        disabled={(
          !showAnswer &&
          !isValid
        )}
      >
        {showAnswer ? 'Next' : 'Check'}
      </Button>

      <Button
        onClick={handleGiveAgain}
        color="error"
        variant="outlined"
        disabled={!showAnswer}
      >
        Practise again later
      </Button>

      <Typography
        variant="h5"
        color='grey.800'
      >
        {showAnswer ? (
          <>
            <HebrewSpan>{occurrence.root.root}</HebrewSpan>
            {' '}
            <FadedSpan>
              (to {occurrence.root.gloss}; {occurrence.root.count} occurrences)
            </FadedSpan>

            {occurrence.parsings.map((p, i) => (
              <Fragment key={`parsing-${i}`}>
                <br />
                <span>
                  {PARSING_SOURCE_NAMES[i]}:
                  {' '}

                  {parsingToString(p)}
                </span>
              </Fragment>
            ))}
          </>
        ) : (
          <HebrewSpan><br /></HebrewSpan>
        )}
      </Typography>

      <Typography
        variant="h6"
        color='grey.800'
      >
        {showAnswer ? (
          <>
            <span>Search in: </span>
            <a href={toLogosLink(occurrence)}>
              <img src="/icon-logos.svg" alt="Logos Bible Software" />
            </a>
          </>
        ) : (
          <br />
        )}
      </Typography>

      {showAnswer && (
        <>
          <Accordion>
            <AccordionSummary disabled={validParsings.length === 1}>
              <Typography variant="h6">
                {validParsings.length === 1 ? 'No' : validParsings.length - 1}
                {' '}
                other parsings for this word
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
                    {' times: '}
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
                    {' times: '}
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
      )}
    </Stack>
  )
}

export default VerbParsingComponent

function getInitialApplicableParts(): ApplicableParts {
  return {
    stem: {
      Qal: true,
      Niphal: true,
      Piel: true,
      Pual: true,
      Hithpael: true,
      Hiphil: true,
      Hophal: true,
    },
    tense: {
      Qatal: true,
      Yiqtol: true,
      Wayyiqtol: true,
      Imperative: true,
      'Active participle': true,
      'Passive participle': true,
      'Infinitive construct': true,
      'Infinitive absolute': true,
    },
    pgn: {
      person: {
        1: true,
        2: true,
        3: true,
        'N/A': false,
      },
      gender: {
        m: true,
        f: true,
        c: true,
        'N/A': false,
      },
      number: {
        s: true,
        p: true,
        'N/A': false,
      },
    },
    suffix: {
      person: {
        1: true,
        2: true,
        3: true,
        'N/A': false,
      },
      gender: {
        m: true,
        f: true,
        c: true,
        'N/A': false,
      },
      number: {
        s: true,
        p: true,
        'N/A': false,
      },
    },
  }
}

export function getInitialParsing(stems: Stem[], tenses: Tense[]): Parsing {
  return {
    stem: stems.length === 1 ? stems[0] : 'N/A',
    tense: tenses.length === 1 ? tenses[0] : 'N/A',
    pgn: {
      person: 'N/A',
      gender: 'N/A',
      number: 'N/A',
    },
    suffix: {
      person: 'N/A',
      gender: 'N/A',
      number: 'N/A',
    },
  }
}
