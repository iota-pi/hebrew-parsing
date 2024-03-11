import type { Gender, Person, Stem, Tense, VerbNumber } from '../../../lambda/data'

export const ALL_STEMS: Stem[] = [
  'Qal',
  'Hiphil',
  'Piel',
  'Niphal',
  'Hitpael',
  'Pual',
  'Hophal',
]
export const ALL_TENSES: Tense[] = [
  'Qatal',
  'Yiqtol',
  'Wayyiqtol',
  'Active participle',
  'Infinitive construct',
  'Imperative',
  'Passive participle',
  'Infinitive absolute',
]
export const ALL_PERSONS: Person[] = [1, 2, 3]
export const ALL_GENDERS: Gender[] = ['m', 'f', null]
export const ALL_NUMBERS: VerbNumber[] = ['s', 'p', null]

export const PART_MAPPING = {
  stem: ALL_TENSES,
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
  tense: t => t,
  person: getPersonName,
  gender: getGenderName,
  number: getNumberName,
  suffix_person: getPersonName,
  suffix_gender: getGenderName,
  suffix_number: getNumberName,
}

export function getPersonName(p: Person) {
  return p === 1 ? 'First' : p === 2 ? 'Second' : 'Third'
}
export function getGenderName(g: Gender) {
  return g === 'm' ? 'Masculine' : g === 'f' ? 'Feminine' : 'Common'
}
export function getNumberName(n: VerbNumber) {
  return n === 's' ? 'Singular' : 'Plural'
}

export function getPartName(part: ParsingPart, value: typeof PART_MAPPING[ParsingPart][number]) {
  return (PART_NAME_MAPPING[part] as NameMappingFunc<typeof part>)(value)
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
