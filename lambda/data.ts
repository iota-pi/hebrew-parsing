import { readFile } from 'node:fs/promises'

export type NA = 'N/A'
export type Stem = (
  | 'Qal'
  | 'Hiphil'
  | 'Piel'
  | 'Niphal'
  | 'Hitpael'
  | 'Pual'
  | 'Hophal'
)
export type Tense = (
  | 'Qatal'
  | 'Yiqtol'
  | 'Wayyiqtol'
  | 'Active participle'
  | 'Infinitive construct'
  | 'Imperative'
  | 'Passive participle'
  | 'Infinitive absolute'
)
export type Person = 1 | 2 | 3 | NA
export type Gender = 'm' | 'f' | 'c' | NA
export type VerbNumber = 's' | 'p' | NA
export type PGN = {
  person: Person,
  gender: Gender,
  number: VerbNumber,
}

type DataWordReference = [string, number, number]
type DataWordContext = [string, string, DataWordReference]
type DataParsing = [Person | null, Gender | null, VerbNumber | null]
type DataVerb = [
  string,
  string,
  Stem,
  Tense,
  DataWordContext,
  DataParsing | null,
  DataParsing | undefined,
]
type DataRoot = [string, number, string]
type DataStats = {
  verbs: number,
  roots: number,
  stems: Record<StemAbbreviation, number>,
  tenses: Record<TenseAbbreviation, number>,
  suffixes: number,
}

export type StemAbbreviation = (
  | 'qal'
  | 'hif'
  | 'piel'
  | 'nif'
  | 'hit'
  | 'pual'
  | 'hof'
)
export type TenseAbbreviation = (
  | 'perf'
  | 'impf'
  | 'wayq'
  | 'ptca'
  | 'infc'
  | 'impv'
  | 'ptcp'
  | 'infa'
)

const stemMapping: Record<StemAbbreviation, Stem> = {
  qal: 'Qal',
  hif: 'Hiphil',
  piel: 'Piel',
  nif: 'Niphal',
  hit: 'Hitpael',
  pual: 'Pual',
  hof: 'Hophal',
}
const tenseMapping: Record<TenseAbbreviation, Tense> = {
  perf: 'Qatal',
  impf: 'Yiqtol',
  wayq: 'Wayyiqtol',
  ptca: 'Active participle',
  infc: 'Infinitive construct',
  impv: 'Imperative',
  ptcp: 'Passive participle',
  infa: 'Infinitive absolute',
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
      context,
      parsing,
      suffixParsing,
    ]) => ({
      verb,
      root,
      stem: getStem(stemCode),
      tense: getTense(tenseCode),
      context,
      parsing: getParsing(parsing),
      suffixParsing: getParsing(suffixParsing),
    })
  )
}
export type Verb = ReturnType<typeof processVerbs>[number]
export type VerbAndRoot = { verb: Verb, root: Root }

export function getStem(code: string) {
  if (code in stemMapping) {
    return stemMapping[code as keyof typeof stemMapping]
  }
  throw new Error(`Unknown stem code "${code}"`)
}

export function getTense(code: string) {
  if (code in tenseMapping) {
    return tenseMapping[code as keyof typeof tenseMapping]
  }
  throw new Error(`Unknown tense code "${code}"`)
}

export function getParsing(input: DataParsing | null | undefined): PGN {
  const [person = null, gender = null, number = null] = input || []
  return {
    person: person === null ? 'N/A' : person,
    gender: gender === null ? 'N/A' : gender,
    number: number === null ? 'N/A' : number,
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
