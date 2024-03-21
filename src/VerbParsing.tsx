import {
  Button,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import {
  Fragment,
  useCallback,
  useMemo,
  useState,
} from 'react'
import styled from '@emotion/styled'
import { grey } from '@mui/material/colors'
import {
  ALL_PARTS,
  CONTEXT_REPLACEMENT_CODE,
  Parsing,
  ParsingKey,
  getPartFromVerb,
  referenceToString,
  stripAccents,
  ApplicableParts,
  checkPart,
  isSimplePart,
  isValidPGN,
} from './components/pages/util'
import type { Verb, Root, PGN } from '../lambda/data'
import ParsingControlGroup from './ParsingControlGroup'
import PGNGroup from './PGNGroup'

const MAIN_PARTS = ALL_PARTS.filter(part => part !== 'suffix')

const FadedSpan = styled('span')({
  color: grey[600],
})
const HighlightedSpan = styled('span')({
  color: 'blue',
})

function VerbParsing({
  verb,
  // root,
  onAnswer,
  onNext,
}: {
  verb: Verb,
  root: Root,
  onAnswer: (correct: boolean) => void,
  onNext: () => void,
}) {
  const [parsing, setParsing] = useState(getInitialParsing())
  const [suffix, setSuffix] = useState<'suffix' | 'no-suffix'>('no-suffix')
  const [showAnswer, setShowAnswer] = useState(false)

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
        parts.suffix.person = false
        parts.suffix.gender = false
        parts.suffix.number = false
      }

      if (parsing.stem && parsing.stem !== 'Qal' && parts.tense) {
        parts.tense['Passive participle'] = false
      }

      return parts
    },
    [parsing, suffix],
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
          for (const key of Object.keys(parsing[part])) {
            if (!applicableParts[part][key as keyof PGN]) {
              continue
            }

            if (parsing[part][key as keyof PGN] === 'N/A') {
              return false
            }
          }
        }
      }

      return isValidPGN(parsing.pgn, parsing)
    },
    [parsing, applicableParts],
  )

  const handleChange = useCallback(
    <T extends ParsingKey>(part: T) => {
      if (showAnswer) {
        return () => {}
      }

      return (newData: Parsing[T]) => {
        console.log('newData', newData, part)

        if (newData) {
          setParsing(prev => ({
            ...prev,
            [part]: newData,
          }))
        }
      }
    },
    [showAnswer],
  )

  const handleToggleSuffix = useCallback(
    (event: React.MouseEvent<HTMLElement>, newData: 'suffix' | 'no-suffix') => {
      console.log('hello!')
      setSuffix(newData)
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

        const answer = getPartFromVerb(part, verb)
        if (!checkPart(part, parsing[part], answer as Parsing[typeof part])) {
          correct = false
          break
        }
      }
      if (!applicableParts.suffix && !!verb.suffixParsing) {
        if (correct) {
          console.warn('I guess this is needed after all')
        }
        correct = false
      }

      onAnswer(correct)
      setShowAnswer(true)
    },
    [verb, parsing, applicableParts, onAnswer],
  )

  const handleNext = useCallback(
    () => {
      setParsing(getInitialParsing())
      setSuffix('suffix')
      setShowAnswer(false)
      onNext()
    },
    [onNext],
  )

  const clauseParts = useMemo(
    () => verb.context[0].split(CONTEXT_REPLACEMENT_CODE),
    [verb.context],
  )
  const verseParts = useMemo(
    () => verb.context[1].split(CONTEXT_REPLACEMENT_CODE),
    [verb.context],
  )
  const clauseElement = useMemo(
    () => clauseParts.map((part, index) => (
      <Fragment key={index}>
        {index > 0 && (
          <HighlightedSpan>
            {verb.verb}
          </HighlightedSpan>
        )}

        {part}
      </Fragment>
    )),
    [clauseParts],
  )
  const verseElement = useMemo(
    () => verseParts.map((part, index) => (
      <Fragment key={index}>
        {index > 0 && clauseElement}

        <FadedSpan>
          {part}
        </FadedSpan>
      </Fragment>
    )),
    [verseParts],
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
          {stripAccents(verb.verb)}
        </HighlightedSpan>
      </Typography>

      <Typography
        variant="h4"
        fontFamily={"'Ezra SIL', Roboto, David, sans-serif"}
        lineHeight={1.5}
        textAlign={'right'}
      >
        {verseElement}
      </Typography>

      <Typography
        variant="h6"
        textAlign={'right'}
        color='grey.600'
      >
        {referenceToString(verb.context[2])}
      </Typography>

      <Stack direction="row" spacing={2}>
        {MAIN_PARTS.map(part => (
          isSimplePart(part) ? (
            <ParsingControlGroup
              key={part}
              part={part}
              verb={verb}
              applicable={applicableParts[part]}
              value={parsing[part]}
              showAnswer={showAnswer}
              onChange={handleChange(part)}
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
              verb={verb}
            />
          )
        ))}

        <ToggleButtonGroup
          exclusive
          orientation="vertical"
          onChange={handleToggleSuffix}
          value={suffix}
        >
          <ToggleButton
            value="no-suffix"
            selected={suffix === 'no-suffix'}
            color={(
              showAnswer
              && suffix === 'no-suffix'
                ? (
                  !verb.suffixParsing ? 'success' : 'error'
                )
                : undefined
            )}
          >
            No Suffix
          </ToggleButton>
          <ToggleButton
            value="suffix"
            selected={suffix === 'suffix'}
            color={(
              showAnswer
              && suffix === 'suffix'
                ? (
                  verb.suffixParsing ? 'success' : 'error'
                )
                : undefined
            )}
          >
            Suffix
          </ToggleButton>
        </ToggleButtonGroup>

        <PGNGroup
          applicable={applicableParts.suffix}
          onChange={handleChange('suffix')}
          parsing={parsing}
          part="suffix"
          showAnswer={showAnswer}
          value={parsing.suffix}
          verb={verb}
        />
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
      Hitpael: true,
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

export function getInitialParsing(): Parsing {
  return {
    stem: 'N/A',
    tense: 'N/A',
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
