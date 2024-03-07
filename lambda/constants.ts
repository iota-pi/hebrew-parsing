export const DIRECTOR_ID: number | undefined = 12360

export const CCB_CAMPUS_IDS = new Map([
  ['campus', 1],
  ['focus cantonese', 6],
  ['focus indonesia', 5],
  ['focus international', 4],
  ['focus mandarin', 2],
  ['unichurch', 7],
  ['staff and post-grads', 8],
  ['cbs alumni and supporters', 3],
])

export const CCB_DEPARTMENT_IDS = new Map([
  ['staff', 6],
  ['core training', 16],
  ['focus team', 20],
  ['lift', 21],
  ['z-inactive-z', 22],
  ['campus', 23],
  ['fic bible studies', 24],
])

export const CCB_GROUP_TYPES = new Map([
  ['bible study', 1],
  ['training group', 11],
  ['service team', 8],
  ['special interest', 6],
  ['task / action', 4],
  ['main ministry group', 10],
  ['public meeting', 5],
  ['campus', 19],
  ['staff', 17],
  ['alumni', 12],
  ['fundraising', 20],
  ['personal supporters group', 18],
  ['thankq - do not use', 2],
])

export const FACULTY_SAVED_SEARCH_IDS = [
  264,  // ADA
  261,  // Business
  267,  // CSE
  262,  // Education
  263,  // Engineering
  268,  // Law
  265,  // Medicine
  266,  // Science
]

export const ATTENDANCE_GROUP_MAP: { [key: string]: number } = {
  ada: 21,
  bus: 19,
  edu: 32,
  eng: 22,
  law: 20,
  med: 18,
  sci: 17,
}
