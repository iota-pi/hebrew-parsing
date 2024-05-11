import type { Stem, Tense } from './filter'

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
  DataPGN | 0 | 1 | undefined,
  0 | 1 | undefined,
]
type DataVerse = [
  BookAbbreviation,
  number,
  number,
  string,
]
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

const rawBookMapping = {
  0: '1_Chronicles',
  1: '1_Kings',
  2: '1_Samuel',
  3: '2_Chronicles',
  4: '2_Kings',
  5: '2_Samuel',
  6: 'Amos',
  7: 'Daniel',
  8: 'Deuteronomy',
  9: 'Ecclesiastes',
  10: 'Esther',
  11: 'Exodus',
  12: 'Ezekiel',
  13: 'Ezra',
  14: 'Genesis',
  15: 'Habakkuk',
  16: 'Haggai',
  17: 'Hosea',
  18: 'Isaiah',
  19: 'Jeremiah',
  20: 'Job',
  21: 'Joel',
  22: 'Jonah',
  23: 'Joshua',
  24: 'Judges',
  25: 'Lamentations',
  26: 'Leviticus',
  27: 'Malachi',
  28: 'Micah',
  29: 'Nahum',
  30: 'Nehemiah',
  31: 'Numbers',
  32: 'Obadiah',
  33: 'Proverbs',
  34: 'Psalms',
  35: 'Ruth',
  36: 'Song_of_songs',
  37: 'Zechariah',
  38: 'Zephaniah',
}
type BookAbbreviation = keyof typeof rawBookMapping
type Book = typeof rawBookMapping[BookAbbreviation]
const bookMapping = rawBookMapping as Record<BookAbbreviation, string>


export function processRoots(roots: DataRoot[]) {
  return roots.map(([
    root,
    count,
    gloss,
  ]) => ({
    root: fromASCIIHebrew(root),
    count,
    gloss,
  }))
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
      book: getBook(book),
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
      suffix: getParsing(
        typeof data[3] === 'number'
          ? undefined
          : data[3]
      ),
      paragogicNun: data[3] === 1 || data[4] === 1,
    })
  )
}
export type VerbParsing = ReturnType<typeof processParsings>[number]


export function processOccurrences(occurrences: DataOccurrence[]) {
  return occurrences.map(
    data => ({
      verb: data[0],
      parsing: data[1],
      verse: data[2],
    })
  )
}
export type VerbOccurrence = ReturnType<typeof processOccurrences>[number]
export type LinkedOccurrence = {
  verb: Verb,
  root: Root,
  parsing: VerbParsing,
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

export function getBook(book: BookAbbreviation) {
  if (book in bookMapping) {
    return bookMapping[book]
  }
  throw new Error(`Unknown book code "${book}"`)
}

export function fromASCIIHebrew(s: string) {
  const hebrewStart = 0x0591
  const asciiStart = 33
  const asArray = Array.from(s)
  return asArray.map(
    c => String.fromCharCode(
      c.charCodeAt(0) > 32
        ? c.charCodeAt(0) - asciiStart + hebrewStart
        : c.charCodeAt(0)
    ),
  ).join('')
}

export function toMap(data: any[]) {
  return Object.fromEntries(
    data.map((d, i) => [i, d])
  )
}

export async function loadData() {
  const response = await fetch('data.json')
  const data = await response.json() as {
    roots: DataRoot[],
    verbs: DataVerb[],
    parsings: DataParsing[],
    verses: DataVerse[],
    occurrences: DataOccurrence[],
  }
  return {
    roots: toMap(processRoots(data.roots)),
    verbs: toMap(processVerbs(data.verbs)),
    parsings: toMap(processParsings(data.parsings)),
    verses: toMap(processVerses(data.verses)),
    occurrences: processOccurrences(data.occurrences),
  }
}
const dataPromise = loadData()

export async function getLinkedOccurrences() {
  const data = await dataPromise
  return data.occurrences.map(
    ({ verb, parsing, verse }) => ({
      verb: data.verbs[verb],
      root: data.roots[data.verbs[verb].root],
      parsing: data.parsings[parsing],
      verse: data.verses[verse],
    } as LinkedOccurrence)
  )
}
