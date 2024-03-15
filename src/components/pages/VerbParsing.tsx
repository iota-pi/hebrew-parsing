import {
  Button,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import { ALL_PARTS, CONTEXT_REPLACEMENT_CODE, PART_MAPPING, Parsing, ParsingPart, checkGender, checkPart, getPartFromVerb, getPartName, referenceToString, stripAccents } from './util'
import type { Verb, Root } from '../../../lambda/data'
import { Fragment, useCallback, useMemo, useState } from 'react'
import styled from '@emotion/styled'
import { grey } from '@mui/material/colors'

const FadedSpan = styled('span')({
  color: grey[600],
})
const HighlightedSpan = styled('span')({
  color: 'blue',
})

const initialParsing: Parsing = {
  stem: null,
  tense: null,
  person: null,
  gender: null,
  number: null,
  suffix_person: null,
  suffix_gender: null,
  suffix_number: null,
}

function VerbParsing({
  verb,
  root,
  onAnswer,
  onNext,
}: {
  verb: Verb,
  root: Root,
  onAnswer: (correct: boolean) => void,
  onNext: () => void,
}) {
  const [parsing, setParsing] = useState({ ...initialParsing })
  const [suffix, setSuffix] = useState<'suffix' | 'no-suffix'>('suffix')
  const [showAnswer, setShowAnswer] = useState(false)

  const applicableParts = useMemo(
    (): ParsingPart[] => {
      let parts = ALL_PARTS;
      if (
        parsing.tense === 'Active participle'
        || parsing.tense === 'Passive participle'
      ) {
        parts = parts.filter(part => part !== 'person')
      }

      if (
        parsing.tense === 'Infinitive construct'
        || parsing.tense === 'Infinitive absolute'
      ) {
        parts = parts.filter(
          part => part !== 'person' && part !== 'gender' && part !== 'number'
        )
      }

      if (suffix === 'no-suffix') {
        parts = parts.filter(
          part => !part.includes('suffix')
        )
      }

      return parts
    },
    [parsing, suffix],
  );
  const disabledOptions = useMemo(
    () => {
      const result: Partial<Record<ParsingPart, (Parsing[ParsingPart] | null)[]>> = {
        tense: (
          parsing.stem && parsing.stem !== 'Qal'
            ? ['Passive participle']
            : []
        ),
        person: (
          parsing.tense === 'Imperative'
            ? [1, 3]
            : []
        ),
        gender: (
          parsing.person === 1
            ? ['m', 'f']
            : []
        ),
        suffix_gender: (
          parsing.suffix_person === 1
            ? ['m', 'f']
            : []
        ),
      }
      return result
    },
    [parsing],
  )

  const handleTogglePart = useCallback(
    <T extends ParsingPart>(part: T) => {
      if (showAnswer) {
        return () => {}
      }

      return (event: React.MouseEvent<HTMLElement>, newData: Parsing[T]) => {
        if (newData) {
          setParsing(prev => ({
            ...prev,
            [part]: newData,
          }))
        }
        if (part === 'tense' && newData === 'Imperative') {
          setParsing(prev => ({
            ...prev,
            person: 2,
          }))
        }
        if (part === 'person' && newData === 1) {
          setParsing(prev => ({
            ...prev,
            gender: 'c',
          }))
        }
        if (part === 'suffix_person' && newData === 1) {
          setParsing(prev => ({
            ...prev,
            suffix_gender: 'c',
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
      for (const part of applicableParts) {
        const answer = getPartFromVerb(part, verb)
        if (!checkPart(part, parsing[part], answer)) {
          correct = false
          break
        }
      }
      if (!applicableParts.includes('suffix_person') && !!verb.suffixParsing) {
        correct = false
      }

      onAnswer(correct)
      setShowAnswer(true)
    },
    [verb, parsing, applicableParts, onAnswer],
  )

  const handleNext = useCallback(
    () => {
      setParsing({ ...initialParsing })
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

      {ALL_PARTS.map(part => (
        <Fragment key={part}>
          {part === 'suffix_person' && (
            <>
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
                        !!verb.suffixParsing ? 'success' : 'error'
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
            </>
          )}

          <ToggleButtonGroup
            onChange={handleTogglePart(part)}
            exclusive
            value={parsing[part]}
            disabled={
              !applicableParts.includes(part)
              && (!showAnswer || !verb.suffixParsing?.person)
            }
          >
            {PART_MAPPING[part].map(value => value && (
              <ToggleButton
                key={value}
                value={value}
                selected={
                  applicableParts.includes(part)
                  && parsing[part] === value
                  && !disabledOptions[part]?.includes(value)
                }
                color={(
                  showAnswer
                    ? (
                      checkPart(part, value, getPartFromVerb(part, verb))
                        ? 'success'
                        : 'error'
                    )
                    : undefined
                )}
                sx={{
                  color: (
                    showAnswer
                    && checkPart(part, value, getPartFromVerb(part, verb))
                    && parsing[part] !== value
                  ) ? 'success.main' : undefined
                }}
                disabled={
                  disabledOptions[part]?.includes(value)
                  && !showAnswer
                }
              >
                {getPartName(part, value)}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Fragment>
      ))}

      <Button
        onClick={showAnswer ? handleNext : checkAnswer}
        color="primary"
        variant="contained"
        disabled={(
          !showAnswer &&
          applicableParts.findIndex(part => parsing[part] === null) >= 0
        )}
      >
        {showAnswer ? 'Next' : 'Check'}
      </Button>
    </Stack>
  )
}

export default VerbParsing
