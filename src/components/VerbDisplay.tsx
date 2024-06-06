import { Fragment, useMemo } from 'react'
import { Typography } from '@mui/material'
import styled from '@emotion/styled'
import { grey } from '@mui/material/colors'
import { getReferenceString, stripAccents } from '../util'
import type { LinkedOccurrence } from '../loadData'


const FadedSpan = styled('span')({
  color: grey[800],
})
const HighlightedSpan = styled('span')({
  color: 'blue',
})

function VerbDisplay({
  occurrence,
}: {
  occurrence: LinkedOccurrence,
}) {
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
  )
}

export default VerbDisplay
