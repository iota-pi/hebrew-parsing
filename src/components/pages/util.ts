import type {
  Gender,
  NA,
  PGN,
  Person,
  Stem,
  Tense,
  Verb,
  VerbNumber,
} from '../../../lambda/data'

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
export const ALL_PERSONS: Person[] = [3, 2, 1]
export const ALL_GENDERS: Gender[] = ['m', 'f', 'c']
export const ALL_NUMBERS: VerbNumber[] = ['s', 'p']

export const PART_MAPPING = {
  stem: ALL_STEMS,
  tense: ALL_TENSES,
  pgn: {
    person: ALL_PERSONS,
    gender: ALL_GENDERS,
    number: ALL_NUMBERS,
  },
  suffix: {
    person: ALL_PERSONS,
    gender: ALL_GENDERS,
    number: ALL_NUMBERS,
  },
}
export type SimpleParsingPartKey = 'stem' | 'tense'
export type SimpleParsingPart = Stem | Tense
export type Parsing = {
  stem: Stem | 'N/A',
  tense: Tense | 'N/A',
  pgn: PGN,
  suffix: PGN,
}
export type ParsingKey = keyof Parsing
export type ApplicableParts = {
  stem: Record<Exclude<Stem, NA>, boolean> | false,
  tense: Record<Exclude<Tense, NA>, boolean> | false,
  pgn: { [K in keyof PGN]: Record<Exclude<PGN[K], NA>, boolean> | false },
  suffix: { [K in keyof PGN]: Record<Exclude<PGN[K], NA>, boolean> | false },
}
export const ALL_PARTS: ParsingKey[] = [
  'stem',
  'tense',
  'pgn',
  'suffix',
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
export function getPGNName<K extends keyof PGN>(key: K, value: PGN[K]) {
  if (key === 'person') {
    return getPersonName(value as Person)
  }
  if (key === 'gender') {
    return getGenderName(value as Gender)
  }
  return getNumberName(value as VerbNumber)
}

export function getStemName(s: Stem) {
  return s
}

export function getTenseName(t: Tense) {
  return (
    t
      .replace('Infinitive ', 'Inf. ')
      .replace('Active p', 'P')
  )
}

export function getSimplePartName<P extends SimpleParsingPartKey>(
  part: P,
  value: Parsing[P],
) {
  if (part === 'stem') {
    return getStemName(value as Stem)
  }
  if (part === 'tense') {
    return getTenseName(value as Tense)
  }
  return value?.toString() || ''
}

export function referenceToString(reference: [string, number, number]) {
  const book = reference[0].replaceAll('_', ' ')
  return `${book} ${reference[1]}:${reference[2]}`
}

export function stripAccents(s: string) {
  return s.replace(/[^\u05b0-\u05bc\u05c1\u05c2\u05c7-\u05ea]/g, '')
}

export function checkSimplePart<T extends SimpleParsingPartKey>(attempt: Parsing[T], correct: Parsing[T]) {
  return attempt === correct
}

export function checkPGN(attempt: PGN, correct: PGN) {
  return {
    person: correct.person === 'N/A' || attempt.person === correct.person,
    gender: correct.gender === 'N/A' || checkGender(attempt.gender, correct.gender),
    number: correct.number === 'N/A' || attempt.number === correct.number,
  }
}

export function checkPart<T extends ParsingKey>(part: T, attempt: Parsing[T], correct?: Parsing[T]) {
  if (isSimplePart(part)) {
    return checkSimplePart(
      attempt as SimpleParsingPart,
      correct as SimpleParsingPart,
    )
  }
  return checkPGN(
    attempt as PGN,
    correct as PGN,
  )
}

export function isSimplePart(part: ParsingKey): part is SimpleParsingPartKey {
  return part === 'stem' || part === 'tense'
}

export function checkGender(attempt: Gender, correct?: Gender) {
  if (attempt === correct) {
    return true
  }
  if (attempt === 'c' && correct === 'N/A') {
    return true
  }
  return false
}

export function getPartFromVerb<P extends ParsingKey>(part: P, verb: Verb): Parsing[P] {
  if (isSimplePart(part)) {
    return verb[part] as Parsing[P]
  }
  if (part === 'pgn') {
    return verb.parsing as Parsing[P]
  } else {
    return verb.suffixParsing as Parsing[P]
  }
}
