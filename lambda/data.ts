import { readFile } from 'node:fs/promises'
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

type DataWordReference = [string, number, number]
type DataWordContext = [string, ...DataWordReference]
type WordContext = {
  clause: string,
  reference: DataWordReference,
}
type DataParsing = [
  PersonAbbreviation,
  GenderAbbreviation,
  VerbNumberAbbreviation,
]
type DataVerb = [
  string,
  string,
  StemAbbreviation,
  TenseAbbreviation,
  ...DataWordContext,
  ...DataParsing,
  ...DataParsing | [undefined, undefined, undefined],
]
type DataRoot = [string, number, string]

export type StemAbbreviation = (
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7
)
export type TenseAbbreviation = (
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7
  | 8
)
export type PersonAbbreviation = Exclude<Person, 'N/A'> | 0
export type GenderAbbreviation = (
  | 0
  | 1
  | 2
  | 3
)
export type VerbNumberAbbreviation = (
  | 0
  | 1
  | 2
)

const stemMapping: Record<StemAbbreviation, Stem> = {
  1: 'Qal',
  2: 'Hiphil',
  3: 'Piel',
  4: 'Niphal',
  5: 'Hitpael',
  6: 'Pual',
  7: 'Hophal',
}
const tenseMapping: Record<TenseAbbreviation, Tense> = {
  1: 'Qatal',
  2: 'Yiqtol',
  3: 'Wayyiqtol',
  4: 'Active participle',
  5: 'Infinitive construct',
  6: 'Imperative',
  7: 'Passive participle',
  8: 'Infinitive absolute',
}
const genderMapping: Record<GenderAbbreviation, Gender> = {
  0: 'N/A',
  1: 'm',
  2: 'f',
  3: 'c',
}
const numberMapping: Record<VerbNumberAbbreviation, VerbNumber> = {
  0: 'N/A',
  1: 's',
  2: 'p',
}

export function processRoots(roots: DataRoot[]) {
  return roots.map(([root, count, gloss]) => ({ root, count, gloss }))
}
export type Root = ReturnType<typeof processRoots>[number]
export type RootMap = Record<string, Root>

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
      person,
      gender,
      number,
      suffixPerson,
      suffixGender,
      suffixNumber,
    ]) => ({
      verb,
      root,
      stem: getStem(stemCode),
      tense: getTense(tenseCode),
      context: {
        clause: clauseContext,
        reference: [book, chapter, verse],
      } as WordContext,
      pgn: getParsing([person, gender, number]),
      suffix: getParsing(
        suffixPerson && suffixGender && suffixNumber
          ? [suffixPerson, suffixGender, suffixNumber]
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

export function getParsing(input: DataParsing | null | undefined): PGN {
  const [person = 0, gender = 0, number = 0] = input || []
  return {
    person: person === 0 ? 'N/A' : getPerson(person),
    gender: gender === 0 ? 'N/A' : getGender(gender),
    number: number === 0 ? 'N/A' : getNumber(number),
  }
}


export const roots = readFile('../data/roots.json').then(
  data => (
    Object.fromEntries(
      processRoots(JSON.parse(data.toString()) as DataRoot[])
        .map(r => [r.root, r])
    ) as Record<string, Root>
  )
)
export const verbs = readFile('../data/verbs.json').then(
  data => processVerbs(JSON.parse(data.toString()) as DataVerb[])
)
