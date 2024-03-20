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
} from './components/pages/util'
import type { Verb, Root, PGN } from '../lambda/data'
import ParsingControlGroup from './ParsingControlGroup'

const MAIN_PARTS = ALL_PARTS.filter(part => part !== 'suffix')
const SUFFIX_PARTS: typeof MAIN_PARTS = ['suffix']

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
  const [suffix, setSuffix] = useState<'suffix' | 'no-suffix'>('suffix')
  const [showAnswer, setShowAnswer] = useState(false)

  const applicableParts = useMemo(
    () => {
      const parts: ApplicableParts = getInitialApplicableParts()

      if (
        (parsing.tense === 'Active participle' || parsing.tense === 'Passive participle')
        && parts.pgn.gender
      ) {
        parts.pgn.person = false
        parts.pgn.gender.c = false
      }

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
      if (parsing.tense === 'Imperative' && parts.pgn.person) {
        parts.pgn.person[1] = false
        parts.pgn.person[3] = false
      }
      if (parsing.pgn?.person === 1 && parts.pgn.person && parts.pgn.gender) {
        parts.pgn.gender.m = false
        parts.pgn.gender.f = false
      }
      if (parsing.suffix?.person === 1 && parts.suffix.person && parts.suffix.gender) {
        parts.suffix.gender.m = false
        parts.suffix.gender.f = false
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

      return true
    },
    [parsing, applicableParts],
  )

  const handleChange = useCallback(
    <T extends ParsingKey>(part: T) => {
      if (showAnswer) {
        return () => {}
      }

      return (newData: Parsing[T]) => {
        if (newData) {
          setParsing(prev => ({
            ...prev,
            [part]: newData,
          }))
        }
        if (part === 'tense' && newData === 'Imperative') {
          setParsing(prev => ({
            ...prev,
            pgn: {
              ...prev.pgn,
              person: 2,
            },
          }))
        }
        if (
          part === 'tense'
          && (newData === 'Active participle' || newData === 'Passive participle')
        ) {
          setParsing(prev => ({
            ...prev,
            pgn: {
              ...prev.pgn,
              person: 'N/A',
            },
          }))
        }
        if (part === 'pgn' && (newData as PGN).person === 1) {
          setParsing(prev => ({
            ...prev,
            pgn: {
              ...prev.pgn,
              gender: 'c',
            },
          }))
        }
        if (part === 'suffix' && (newData as PGN).person === 1) {
          setParsing(prev => ({
            ...prev,
            suffix: {
              ...prev.pgn,
              gender: 'c',
            },
          }))
        }
      }
    },
    [showAnswer],
  )

  const handleToggleSuffix = useCallback(
    (event: React.MouseEvent<HTMLElement>, newData: 'suffix' | 'no-suffix') => {
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
          <ParsingControlGroup
            key={part}
            part={part}
            verb={verb}
            applicable={applicableParts[part]}
            value={parsing[part]}
            showAnswer={showAnswer}
            onChange={handleChange(part)}
          />
        ))}
      </Stack>

      <Typography
        variant="h6"
        pt={2}
      >
        Pronominal Suffix
      </Typography>

      <ToggleButtonGroup
        exclusive
        onChange={handleToggleSuffix}
        value={suffix}
      >
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
          sx={{
            color: (
              showAnswer
              && suffix === 'no-suffix'
              && !!verb.suffixParsing
            ) ? 'success.main' : undefined
          }}
        >
          Suffix
        </ToggleButton>
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
          sx={{
            color: (
              showAnswer
              && suffix === 'suffix'
              && !verb.suffixParsing
            ) ? 'success.main' : undefined
          }}
        >
          No Suffix
        </ToggleButton>
      </ToggleButtonGroup>

      <Stack direction="row" spacing={2}>
        {SUFFIX_PARTS.map(part => (
          <ParsingControlGroup
            key={part}
            part={part}
            verb={verb}
            applicable={applicableParts[part]}
            value={parsing[part]}
            showAnswer={showAnswer}
            onChange={handleChange(part)}
          />
        ))}
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
      },
      gender: {
        m: true,
        f: true,
        c: true,
      },
      number: {
        s: true,
        p: true,
      },
    },
    suffix: {
      person: {
        1: true,
        2: true,
        3: true,
      },
      gender: {
        m: true,
        f: true,
        c: true,
      },
      number: {
        s: true,
        p: true,
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
