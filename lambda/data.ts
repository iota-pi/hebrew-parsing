import { readFile } from 'node:fs/promises'

type DataWordReference = [string, number, number]
type DataWordContext = [string, string, DataWordReference]
export type Person = 1 | 2 | 3
export type Gender = 'm' | 'f' | 'c' | null
export type VerbNumber = 's' | 'p' | null
type DataParsing = [Person, Gender, VerbNumber]
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
type DataVerb = [
  string,
  string,
  Stem,
  Tense,
  DataWordContext,
  DataParsing | null,
  DataParsing | undefined,
]
type DataRoot = [string, number]

const stemMapping: Record<string, Stem> = {
  qal: 'Qal',
  hif: 'Hiphil',
  piel: 'Piel',
  nif: 'Niphal',
  hit: 'Hitpael',
  pual: 'Pual',
  hof: 'Hophal',
}
const tenseMapping: Record<string, Tense> = {
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
  return roots.map(([root, count]) => ({ root, count }))
}
export type Root = ReturnType<typeof processRoots>[number]

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

export function getParsing(input: DataParsing | null | undefined) {
  if (!input) {
    return null
  }
  const [person, gender, number] = input
  return {
    person,
    gender,
    number,
  }
}


export const roots = readFile('../data/roots.json').then(
  data => processRoots(JSON.parse(data.toString()) as DataRoot[])
)
export const verbs = readFile('../data/verbs.json').then(
  data => processVerbs(JSON.parse(data.toString()) as DataVerb[])
)
