import { readFile } from 'node:fs/promises'
import type { Stem, Tense } from './filter'
import { existsSync } from 'node:fs'
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3'

export type NA = 'N/A'
export type Person = 1 | 2 | 3 | NA
export type Gender = 'm' | 'f' | 'c' | NA
export type VerbNumber = 's' | 'p' | NA
export type PGN = {
  person: Person,
  gender: Gender,
  number: VerbNumber,
}

type DataWordReference = [BookAbbreviation, number, number]
type WordReference = [Book, number, number]
type DataWordContext = [string, ...DataWordReference]
type WordContext = {
  clause: string,
  reference: WordReference,
}
type DataPGN = [
  PersonAbbreviation,
  GenderAbbreviation,
  VerbNumberAbbreviation,
]
type DataVerb = [
  string,
  number,
  StemAbbreviation,
  TenseAbbreviation,
  ...DataWordContext,
  PGNAbbreviation,
  PGNAbbreviation | undefined,
]
type DataRoot = [number, string, number, string]

const rawStemMapping = {
  1: 'Qal',
  2: 'Hiphil',
  3: 'Piel',
  4: 'Niphal',
  5: 'Hitpael',
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

const rawPGNMapping = {
  0: [0, 0, 0],
  5: [0, 1, 1],
  9: [0, 1, 2],
  12: [0, 2, 1],
  13: [0, 2, 2],
  8: [3, 0, 2],
  1: [3, 1, 1],
  3: [3, 1, 2],
  6: [3, 2, 1],
  14: [3, 2, 2],
  2: [2, 1, 1],
  7: [2, 1, 2],
  11: [2, 2, 1],
  15: [2, 2, 2],
  4: [1, 0, 1],
  10: [1, 0, 2],
}
type PGNAbbreviation = keyof typeof rawPGNMapping
const pgnMapping = rawPGNMapping as Record<PGNAbbreviation, DataPGN>

export function processRoots(roots: DataRoot[]) {
  return roots.map(([id, root, count, gloss]) => ({ id, root, count, gloss }))
}
export type Root = ReturnType<typeof processRoots>[number]
export type RootMap = Record<number, Root>

export function processVerbs(verbs: DataVerb[]) {
  return verbs.map(
    ([
      verb,
      root,
      stemCode,
      tenseCode,
      clauseContext,
      book,
      chapter,
      verse,
      pgn,
      suffix,
    ]) => ({
      verb,
      root,
      stem: getStem(stemCode),
      tense: getTense(tenseCode),
      context: {
        clause: clauseContext,
        reference: [getBook(book), chapter, verse],
      } as WordContext,
      pgn: getParsing(pgnMapping[pgn]),
      suffix: getParsing(
        suffix
          ? pgnMapping[suffix]
          : undefined
      ),
    })
  )
}
export type Verb = ReturnType<typeof processVerbs>[number]
export type VerbAndRoot = { verb: Verb, root: Root }

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


const s3 = new S3Client()

export async function flexibleLoadFile(path: string) {
  const localPath = [
    path,
    `data/${path}`,
    `../data/${path}`,
  ].filter(p => existsSync(p))
  let data: string
  if (localPath.length > 0) {
    data = (await readFile(localPath[0])).toString()
  } else {
    const s3Path = `data/${path}`
    const getObjectRequest = await s3.send(new GetObjectCommand({
      Bucket: 'hebrew-parsing-production',
      Key: s3Path,
    }))
    data = await (getObjectRequest).Body?.transformToString() || ''
  }

  return JSON.parse(data)
}


export const roots = flexibleLoadFile('roots.json').then(
  data => (
    Object.fromEntries(
      processRoots(data as DataRoot[])
        .map(r => [r.id, r])
    ) as Record<number, Root>
  )
)
export const verbs = flexibleLoadFile('verbs.json').then(
  data => processVerbs(data as DataVerb[])
)
