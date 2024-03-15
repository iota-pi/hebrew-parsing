import type { Gender, Person, Stem, Tense, Verb, VerbNumber } from '../../../lambda/data'

export const CONTEXT_REPLACEMENT_CODE = '$'

export const ALL_STEMS: Stem[] = [
  'Qal',
  'Niphal',
  'Piel',
  'Pual',
  'Hitpael',
  'Hiphil',
  'Hophal',
]
export const ALL_TENSES: Tense[] = [
  'Qatal',
  'Yiqtol',
  'Wayyiqtol',
  'Imperative',
  'Active participle',
  'Passive participle',
  'Infinitive construct',
  'Infinitive absolute',
]
export const ALL_PERSONS: Person[] = [1, 2, 3]
export const ALL_GENDERS: Gender[] = ['m', 'f', 'c']
export const ALL_NUMBERS: VerbNumber[] = ['s', 'p']

export const PART_MAPPING = {
  stem: ALL_STEMS,
  tense: ALL_TENSES,
  person: ALL_PERSONS,
  gender: ALL_GENDERS,
  number: ALL_NUMBERS,
  suffix_person: ALL_PERSONS,
  suffix_gender: ALL_GENDERS,
  suffix_number: ALL_NUMBERS,
}
export type ParsingPart = keyof typeof PART_MAPPING
type NameMappingFunc<K extends ParsingPart> = (
  (value: typeof PART_MAPPING[K][number]) => string
)
export const PART_NAME_MAPPING: {
  [K in ParsingPart]: NameMappingFunc<K>
} = {
  stem: s => s,
  tense: getTenseName,
  person: getPersonName,
  gender: getGenderName,
  number: getNumberName,
  suffix_person: getPersonName,
  suffix_gender: getGenderName,
  suffix_number: getNumberName,
}
export type Parsing = {
  [K in ParsingPart]: typeof PART_MAPPING[K][number] | null;
}
export const ALL_PARTS: ParsingPart[] = [
  'stem',
  'tense',
  'person',
  'gender',
  'number',
  'suffix_person',
  'suffix_gender',
  'suffix_number',
]

export function getPersonName(p: Person) {
  return p === 1 ? 'First' : p === 2 ? 'Second' : 'Third'
}
export function getGenderName(g: Gender) {
  return g === 'm' ? 'Masculine' : g === 'f' ? 'Feminine' : 'Common'
}
export function getNumberName(n: VerbNumber) {
  return n === 's' ? 'Singular' : 'Plural'
}

export function getTenseName(t: Tense) {
  return (
    t
      .replace('Infinitive ', 'Inf. ')
      .replace('Active p', 'P')
  )
}

export function getPartName(part: ParsingPart, value: typeof PART_MAPPING[ParsingPart][number]) {
  return (PART_NAME_MAPPING[part] as NameMappingFunc<typeof part>)(value)
}

export function referenceToString(reference: [string, number, number]) {
  const book = reference[0].replaceAll('_', ' ')
  return `${book} ${reference[1]}:${reference[2]}`
}

export function stripAccents(s: string) {
  return s.replace(/[^\u05b0-\u05bc\u05c1\u05c2\u05c7-\u05ea]/g, '')
}

export function checkPart<T extends ParsingPart>(part: T, attempt: Parsing[T], correct?: Parsing[T]) {
  if (part === 'gender' || part === 'suffix_gender') {
    return checkGender(attempt as Gender, correct as Gender)
  }
  return attempt === correct
}

export function checkGender(attempt: Gender, correct?: Gender) {
  if (attempt === correct) {
    return true
  }
  if (attempt === 'c' && correct === null) {
    return true
  }
  return false
}

export function getPartFromVerb(part: ParsingPart, verb: Verb): Parsing[ParsingPart] {
  if (part === 'stem' || part === 'tense') {
    return verb[part]
  }
  if (part === 'person' || part === 'gender' || part === 'number') {
    return verb.parsing?.[part] as Parsing[typeof part]
  } else {
    const suffixPart = part.replace('suffix_', '') as 'person' | 'gender' | 'number'
    return verb.suffixParsing?.[suffixPart] as Parsing[typeof part]
  }
}
