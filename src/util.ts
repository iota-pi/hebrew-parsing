import type {
  Gender,
  LinkedOccurrence,
  NA,
  PGN,
  Person,
  VerbNumber,
  VerbParsing,
  Verse,
} from './loadData'
import type { RootKey, Stem, Tense } from './filter'
import { ParsingCondition, equivalents } from './paradigms'

export type OptionCorrectness = {
  match: boolean,
  exact: boolean,
}

export type Entries<T> = {
  [K in keyof T]: [K, T[K]]
}[keyof T][]

export const ONE_DAY = 1000 * 60 * 60 * 24
export const ONE_WEEK = ONE_DAY * 7

export const ALL_STEMS: Stem[] = [
  'Qal',
  'Niphal',
  'Piel',
  'Pual',
  'Hithpael',
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
export type Parsing = {
  stem: Stem | 'N/A',
  tense: Tense | 'N/A',
  pgn: PGN,
  suffix: PGN,
}
export type ParsingKey = keyof Parsing
export type SimpleParsingPart = Stem | Tense
export type SimpleParsingPartKey = ParsingKey & ('stem' | 'tense')
export type PGNParsingKey = ParsingKey & ('pgn' | 'suffix')
export type ApplicableParts = {
  stem: Record<Exclude<Stem, NA>, boolean> | false,
  tense: Record<Exclude<Tense, NA>, boolean> | false,
  pgn: { [K in keyof PGN]: Record<PGN[K], boolean> | false },
  suffix: { [K in keyof PGN]: Record<PGN[K], boolean> | false } | false,
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
export function getPGNKey(pgn: PGN) {
  const p = pgn.person === 'N/A' ? '' : pgn.person.toString()
  const g = (
    pgn.gender === 'N/A'
      ? (pgn.person === 'N/A' ? '' : 'c')
      : pgn.gender
  )
  const n = pgn.number === 'N/A' ? '' : pgn.number
  return p + g + n
}

export function getRootTypeName(r: RootKey) {
  return r.charAt(0).toUpperCase() + r.slice(1)
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

export function getReferenceString(reference: Verse, book: string) {
  return `${book} ${reference.chapter}:${reference.verse}`
}

export function stripAccents(s: string) {
  return s.replace(/[^\u05b0-\u05bc\u05c1\u05c2\u05c7-\u05ea]/g, '')
}

export function getRootTypes(root: string) {
  const rootTypes = new Set<RootKey>()
  const normalisedRoot = root.replace(/[\u05c1\u05c2]/g, '')
  const r1 = normalisedRoot[0]
  const r2 = normalisedRoot[1]
  const r3 = normalisedRoot[2]
  if ('עהחר'.includes(r1)) {
    rootTypes.add('1-gutteral')
  }

  if ('א' === r1) {
    rootTypes.add('1-aleph')
  }

  if ('נ' === r1) {
    rootTypes.add('1-nun')
  }

  if ('וי'.includes(r1) || root === 'הלך') {
    rootTypes.add('1-waw')
  }

  if ('אעהחר'.includes(r2)) {
    rootTypes.add('2-gutteral')
  }

  if ('ה' === r3) {
    rootTypes.add('3-heh')
  }

  if ('א' === r3) {
    rootTypes.add('3-aleph')
  }

  if (
    ('וי'.includes(r2) || normalisedRoot.length === 2)
    && root !== 'היה'
    && root !== 'חיה'
    && root !== 'צוה'
  ) {
    rootTypes.add('hollow')
  }

  if (r2 === replaceSofits(r3)) {
    rootTypes.add('geminate')
  }

  if (rootTypes.size === 0) {
    rootTypes.add('strong')
  }

  return rootTypes
}

export function replaceSofits(str: string) {
  return (
    str
      .replace('ך', 'כ')
      .replace('ם', 'מ')
      .replace('ן', 'נ')
      .replace('ף', 'פ')
      .replace('ץ', 'צ')
  )
}

export function checkSimplePart<T extends SimpleParsingPartKey>(
  part: T,
  fullParsingAttempt: Parsing,
  correct: Parsing[T],
) {
  let answer = correct
  if (fullParsingAttempt.stem !== 'Qal') {
    if (part === 'tense' && correct === 'Passive participle') {
      answer = 'Active participle' as Parsing[T]
    }
  }
  return fullParsingAttempt[part] === answer
}

export function checkPGN(
  fullParsingAttempt: Parsing,
  part: PGNParsingKey,
  correct: PGN,
): OptionCorrectness {
  if (!hasSetPGN(correct)) {
    return { match: false, exact: false }
  }

  if (fullParsingAttempt.tense === 'Imperative' && part === 'pgn') {
    correct = {
      ...correct,
      person: 'N/A',
    }
  }

  const attempt = fullParsingAttempt[part]
  const alternatives = [correct]
  if (part === 'pgn') {
    alternatives.push(
      ...getMatchingAlternatives(fullParsingAttempt, correct),
    )
  }
  for (const alt of alternatives) {
    if (
      (alt.person === 'N/A' || attempt.person === alt.person)
      && (alt.gender === 'N/A' || checkGender(attempt.gender, alt.gender))
      && (alt.number === 'N/A' || attempt.number === alt.number)
    ) {
      return { match: true, exact: alt === correct }
    }
  }
  return { match: false, exact: false }
}

export function pgnEquals(a: PGN, b: PGN) {
  return (
    a.person === b.person
    && a.gender === b.gender
    && a.number === b.number
  )
}

export function getMatchingAlternatives(
  attempt: Parsing,
  correct: PGN,
): PGN[] {
  const conditionGroups = equivalents.filter(
    group => group.some(
      condition => checkParsingCondition({ ...attempt, pgn: correct }, condition),
    ),
  )
  return conditionGroups.flatMap(
    group => group.map(
      condition => condition.pgn,
    )
  )
}

export function checkParsingCondition(
  attempt: Parsing,
  condition: ParsingCondition,
) {
  return Object.entries(condition).every(([key, value]) => (
    key === 'pgn' || key === 'suffix'
      ? pgnEquals(attempt[key], value as PGN)
      : attempt[key as keyof ParsingCondition] === value
  ))
}

export function checkPart<T extends ParsingKey>(part: T, attempt: Parsing, correct: Parsing[T]) {
  if (isSimplePart(part)) {
    return checkSimplePart<typeof part>(
      part,
      attempt,
      attempt[part],
    )
  }

  return checkPGN(
    attempt,
    part,
    correct as PGN,
  ).match
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

export function getPartFromVerb<P extends ParsingKey>(part: P, verb: VerbParsing): Parsing[P] {
  return verb[part] as Parsing[P]
}

export function hasSetPGN(pgn: PGN) {
  return (
    pgn.person !== 'N/A'
    || pgn.gender !== 'N/A'
    || pgn.number !== 'N/A'
  )
}

export function isValidPGN(pgn: PGN, parsing?: Parsing, suffix = false) {
  if (
    parsing?.tense !== 'Infinitive construct'
    && parsing?.tense !== 'Infinitive absolute'
    && !hasSetPGN(pgn)
  ) {
    return false
  }
  if (pgn.person === 1 && pgn.gender !== 'c') {
    return false
  }

  const has3cp = parsing?.tense === 'Qatal'
  if (
    pgn.gender === 'c'
    && pgn.person !== 1
    && !(has3cp && pgn.person === 3 && pgn.number === 'p' && !suffix)
  ) {
    return false
  }
  if (has3cp && pgn.person === 3 && pgn.number === 'p' && pgn.gender !== 'c') {
    return false
  }

  return true
}

export function isValidSuffix(pgn: PGN) {
  return isValidPGN(pgn, undefined, true)
}

export function removeInitialDagesh(s: string) {
  if (s.charAt(1) === 'ו') {
    // Don't remove dagesh in shureq if it is the second letter of the word
    return s
  }
  return s.slice(0, 3).replace(/\u05bc/g, '') + s.slice(3)
}

export function hasSameSpelling(a: LinkedOccurrence, b: LinkedOccurrence) {
  const v1 = removeInitialDagesh(a.verb.verb)
  const v2 = removeInitialDagesh(b.verb.verb)
  return v1 === v2
}

export function getAllValidParsings(occurrence: LinkedOccurrence, occurrences: LinkedOccurrence[]) {
  const allOccurrences = occurrences.filter(
    o => hasSameSpelling(o, occurrence)
  )
  // TODO: run a check to see if this is ever necessary;
  // if it is then the root should be displayed along with the parsing
  if (allOccurrences.some(o => o.root.root !== occurrence.root.root)) {
    console.warn('Root mismatch in other parsings')
  }

  const parsings = allOccurrences.flatMap(o => o.parsings)
  const counts = parsings.reduce(
    (acc, p) => {
      acc.set(p, (acc.get(p) || 0) + 1)
      return acc
    },
    new Map<VerbParsing, number>(),
  )
  return Array.from(counts.entries()).sort(([, v1], [, v2]) => v2 - v1)
}

export function parsingToString(parsing: VerbParsing) {
  return (
    [
      getStemName(parsing.stem),
      getTenseName(parsing.tense),
      getPGNKey(parsing.pgn),
      hasSetPGN(parsing.suffix)
      && `+ ${getPGNKey(parsing.suffix)} suffix`,
      parsing.energicNun && '+ energic nun',
      parsing.paragogicNun && '+ paragogic nun',
      parsing.paragogicHeh && '+ paragogic heh',
      parsing.cohortative && '+ cohortative heh',
    ].filter(Boolean).join(' ')
  )
}

export function toLogosSearch({ parsings, root }: LinkedOccurrence) {
  const stemCodes: Record<Stem, string> = {
    Qal: '[aZ]',
    Piel: '[bCxRyNGzQ]',
    Hiphil: 'c',
    Niphal: 'd',
    Pual: '[eFAwIKL]',
    Hithpael: '[gTOBDSEPl]',
    Hophal: 'i',
  }
  const stem = stemCodes[parsings[0].stem]

  const tenseCodes: Record<Tense, string> = {
    Qatal: '[Pp]',
    Yiqtol: '[Iw]',
    Wayyiqtol: 'W',
    'Active participle': 'R',
    'Passive participle': 'S',
    'Infinitive construct': 'F',
    'Infinitive absolute': 'F',
    Imperative: 'M',
  }
  const tense = tenseCodes[parsings[0].tense]

  const person = '?'
  const gender = '?'
  const number = '?'
  const state = (
    parsings[0].tense === 'Infinitive construct'
      ? 'C'
      : (
        parsings[0].tense === 'Infinitive absolute'
          ? 'A'
          : '?'
      )
  )

  return `root.h:${root.root}@V${stem}${tense}${person}${gender}${number}${state}`
}

export function toLogosLink(word: LinkedOccurrence) {
  const q = encodeURIComponent(toLogosSearch(word))
  return (
    `logos4:Search;kind=BibleSearch;q=${q};`
    + 'syntax=v2;documentlevel=verse;match=nostem;'
    + 'in=raw:Single$7CResourceId$3DLLS:LHB'
  )
}
