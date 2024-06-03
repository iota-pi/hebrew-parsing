import type { Stem, Tense } from './filter'
import { getRootTypes } from './util'

export type NA = 'N/A'
export type Person = 1 | 2 | 3 | NA
export type Gender = 'm' | 'f' | 'c' | NA
export type VerbNumber = 's' | 'p' | NA
export type PGN = {
  person: Person,
  gender: Gender,
  number: VerbNumber,
}

type DataPGN = [
  PersonAbbreviation,
  GenderAbbreviation,
  VerbNumberAbbreviation,
]
type DataVerb = [
  string,
  number,
]
type DataOccurrence = [
  number,
  number,
  number,
]
type DataParsing = [
  StemAbbreviation,
  TenseAbbreviation,
  DataPGN,
  DataPGN,
  0 | 1,
  0 | 1,
  0 | 1,
]
type DataVerse = [
  number,
  number,
  number,
  string,
]
type DataBook = string
type DataRoot = [string, number, string]

const rawStemMapping = {
  1: 'Qal',
  2: 'Hiphil',
  3: 'Piel',
  4: 'Niphal',
  5: 'Hithpael',
  6: 'Pual',
  7: 'Hophal',
} as const
type StemAbbreviation = keyof typeof rawStemMapping
const stemMapping = rawStemMapping as Record<StemAbbreviation, Stem>

const rawTenseMapping = {
  1: 'Qatal',
  2: 'Yiqtol',
  3: 'Wayyiqtol',
  4: 'Active participle',
  5: 'Infinitive construct',
  6: 'Imperative',
  7: 'Passive participle',
  8: 'Infinitive absolute',
} as const
type TenseAbbreviation = keyof typeof rawTenseMapping
const tenseMapping = rawTenseMapping as Record<TenseAbbreviation, Tense>

type PersonAbbreviation = Exclude<Person, 'N/A'> | 0

const rawGenderMapping = {
  0: 'N/A',
  1: 'm',
  2: 'f',
  3: 'c',
} as const
type GenderAbbreviation = keyof typeof rawGenderMapping
const genderMapping = rawGenderMapping as  Record<GenderAbbreviation, Gender>

const rawNumberMapping = {
  0: 'N/A',
  1: 's',
  2: 'p',
} as const
type VerbNumberAbbreviation = keyof typeof rawNumberMapping
const numberMapping = rawNumberMapping as Record<VerbNumberAbbreviation, VerbNumber>


export function processRoots(roots: DataRoot[]) {
  return roots.map(([
    root,
    count,
    gloss,
  ]) => {
    const r = fromASCIIHebrew(root)
    return {
      root: r,
      count,
      gloss,
      types: getRootTypes(r),
    }
  })
}
export type Root = ReturnType<typeof processRoots>[number]
export type RootMap = Record<number, Root>


export function processVerses(verses: DataVerse[]) {
  return verses.map(
    ([
      book,
      chapter,
      verse,
      text,
    ]) => ({
      book,
      chapter,
      verse,
      text: fromASCIIHebrew(text),
    })
  )
}
export type Verse = ReturnType<typeof processVerses>[number]


export function processVerbs(verbs: DataVerb[]) {
  return verbs.map(
    ([
      verb,
      root,
    ]) => ({
      verb: fromASCIIHebrew(verb),
      root,
    })
  )
}
export type Verb = ReturnType<typeof processVerbs>[number]


export function processParsings(parsings: DataParsing[]) {
  return parsings.map(
    data => ({
      stem: getStem(data[0]),
      tense: getTense(data[1]),
      pgn: getParsing(data[2]),
      suffix: getParsing(data[3]),
      paragogicNun: data[4] === 1,
      paragogicHeh: data[5] === 1,
      cohortative: data[6] === 1,
    })
  )
}
export type VerbParsing = ReturnType<typeof processParsings>[number]


export function processOccurrences(occurrences: DataOccurrence[]) {
  return occurrences.map(
    data => ({
      verb: data[0],
      verse: data[1],
      parsings: data.slice(2),
    })
  )
}
export type VerbOccurrence = ReturnType<typeof processOccurrences>[number]
export type LinkedOccurrence = {
  book: string,
  root: Root,
  parsings: VerbParsing[],
  verb: Verb,
  verse: Verse,
}


export function getStem(code: StemAbbreviation) {
  if (code in stemMapping) {
    return stemMapping[code as keyof typeof stemMapping]
  }
  throw new Error(`Unknown stem code "${code}"`)
}

export function getTense(code: TenseAbbreviation) {
  if (code in tenseMapping) {
    return tenseMapping[code as keyof typeof tenseMapping]
  }
  throw new Error(`Unknown tense code "${code}"`)
}

export function getPerson(code: PersonAbbreviation): Person {
  if (code === 0) {
    return 'N/A'
  }
  return code
}

export function getGender(code: GenderAbbreviation): Gender {
  if (code in genderMapping) {
    return genderMapping[code as keyof typeof genderMapping]
  }
  throw new Error(`Unknown gender code "${code}"`)
}

export function getNumber(code: VerbNumberAbbreviation): VerbNumber {
  if (code in numberMapping) {
    return numberMapping[code as keyof typeof numberMapping]
  }
  throw new Error(`Unknown number code "${code}"`)
}

export function getParsing(input: DataPGN | null | undefined): PGN {
  const [person = 0, gender = 0, number = 0] = input || []
  return {
    person: person === 0 ? 'N/A' : getPerson(person),
    gender: gender === 0 ? 'N/A' : getGender(gender),
    number: number === 0 ? 'N/A' : getNumber(number),
  }
}

const hebrewStart = 0x0591
const asciiStart = 33
const hebrewOffset = hebrewStart - asciiStart
export function fromASCIIHebrew(s: string) {
  const asArray = Array.from(s)
  return asArray.map(
    c => {
      const n = c.charCodeAt(0)
      return String.fromCharCode(
        n === 32 ? n : n + hebrewOffset
      )
    },
  ).join('')
}

export async function loadData() {
  const response = await fetch('data.json')
  const data = await response.json() as {
    books: DataBook[]
    occurrences: DataOccurrence[],
    parsings: DataParsing[],
    roots: DataRoot[],
    verbs: DataVerb[],
    verses: DataVerse[],
  }
  return {
    books: data.books,
    roots: processRoots(data.roots),
    verbs: processVerbs(data.verbs),
    parsings: processParsings(data.parsings),
    verses: processVerses(data.verses),
    occurrences: processOccurrences(data.occurrences),
  }
}
const dataPromise = loadData()

export async function getLinkedOccurrences() {
  const data = await dataPromise
  return data.occurrences.map(
    ({ verb, parsings, verse }) => ({
      book: data.books[data.verses[verse].book],
      parsings: parsings.map(p => data.parsings[p]),
      root: data.roots[data.verbs[verb].root],
      verb: data.verbs[verb],
      verse: data.verses[verse],
    } as LinkedOccurrence)
  )
}
