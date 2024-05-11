import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
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
  checkPart,
  isSimplePart,
  isValidPGN,
  isValidSuffix,
  getStemName,
  getTenseName,
  getPGNKey,
  hasSetPGN,
  toLogosLink,
} from '../util'
import type { LinkedOccurrence } from '../loadData'
import type { FilterCondition, Stem, Tense } from '../filter'
import ParsingControlGroup from './ParsingControlGroup'
import PGNGroup from './PGNGroup'
import SuffixSelection, { Suffix } from './SuffixSelection'

const MAIN_PARTS = ALL_PARTS.filter(part => part !== 'suffix')
const DEFAULT_SUFFIX: Suffix = 'no-suffix'

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

function VerbParsing({
  filterOptions,
  occurrence: rawOccurrence,
  onAnswer,
  onNext,
  onGiveAgain,
}: {
  filterOptions: FilterCondition,
  occurrence: LinkedOccurrence,
  onAnswer: (correct: boolean) => void,
  onNext: () => void,
  onGiveAgain: () => void,
}) {
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

  const [occurrence, setVerb] = useState(rawOccurrence)
  useEffect(
    () => {
      if (!showAnswer) {
        setVerb(rawOccurrence)
      }
    },
    [showAnswer, rawOccurrence],
  )

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
      let correct = true
      for (const part of ALL_PARTS) {
        if (!applicableParts[part]) {
          continue
        }

        const answer = occurrence.parsing[part]
        if (!checkPart(part, parsing, answer as Parsing[typeof part])) {
          correct = false
          break
        }
      }
      if (!applicableParts.suffix && isValidSuffix(occurrence.parsing.suffix)) {
        correct = false
      }

      onAnswer(correct)
      setShowAnswer(true)
    },
    [occurrence, parsing, applicableParts, onAnswer],
  )

  const handleNext = useCallback(
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
      onNext()
    },
    [canHaveSuffixes, mustHaveSuffixes, onNext, stems, tenses],
  )

  const replacementCode = useMemo(
    () => new RegExp(
      '\\b('
      + Array.from(occurrence.verb.verb).join(
        '[\u05b0-\u05bc\u05c1\u05c2\u05c7-\u05ea]?'
      )
      + ')\\b',
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
      <Typography
        variant="h2"
        textAlign="center"
        fontFamily={"'Ezra SIL', Roboto, David, sans-serif"}
        py={2}
      >
        <HighlightedSpan>
          {stripAccents(occurrence.verb.verb)}
        </HighlightedSpan>
      </Typography>

      <Typography
        variant="h4"
        fontFamily={"'Ezra SIL', Roboto, David, sans-serif"}
        lineHeight={1.5}
        textAlign={'right'}
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
        {getReferenceString(occurrence.verse)}
      </Typography>

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
              parsing={occurrence.parsing}
            />

            <PGNGroup
              applicable={applicableParts.suffix}
              onChange={handleChange('suffix')}
              parsing={parsing}
              part="suffix"
              showAnswer={showAnswer}
              value={parsing.suffix}
              occurrence={occurrence}
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
        onClick={onGiveAgain}
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
            {'; '}
            {[
              getStemName(occurrence.parsing.stem),
              getTenseName(occurrence.parsing.tense),
              getPGNKey(occurrence.parsing.pgn),
              hasSetPGN(occurrence.parsing.suffix)
              && `+ ${getPGNKey(occurrence.parsing.suffix)} suffix`,
              occurrence.parsing.paragogicNun && '+ paragogic nun',
            ].filter(Boolean).join(' ')}
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
    </Stack>
  )
}

export default VerbParsing

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
