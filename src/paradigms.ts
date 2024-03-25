import { Parsing } from './util'

export type ParsingCondition = Pick<Parsing, 'tense' | 'pgn'>

export const equivalents: ParsingCondition[][] = [
  [
    { tense: 'Yiqtol', pgn: { person: 2, gender: 'm', number: 's' } },
    { tense: 'Yiqtol', pgn: { person: 3, gender: 'f', number: 's' } },
  ],
  [
    { tense: 'Yiqtol', pgn: { person: 3, gender: 'f', number: 'p' } },
    { tense: 'Yiqtol', pgn: { person: 2, gender: 'f', number: 'p' } },
  ],
]
