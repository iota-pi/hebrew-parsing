import { FilterCondition, Stem, checkRootType } from './filter'
import type { Root } from './loadData'
import { getRootTypes } from './util'

const defaultRoot: Root = {
  count: 0,
  gloss: '',
  root: '',
  types: new Set(),
}

describe('checkRootType', () => {
  it('should return true when all conditions are met', () => {
    const stem = 'Qal'
    const root = 'אבג'
    const condition = {
      strong: true,
      '1-gutteral': true,
      '1-aleph': true,
      '1-nun': true,
      '1-waw': true,
      '1-yod': true,
      '2-gutteral': true,
      '3-heh': true,
      '3-aleph': true,
      hollow: true,
      geminate: true,
    }
    const rootObj = { ...defaultRoot, root: root, types: getRootTypes(root) }
    const result = checkRootType(rootObj, condition, stem)
    expect(result).toBe(true)
  })

  it.each([
    ['אכל', { '1-gutteral': true }, 'Qal', false],
    ['אכל', { '1-gutteral': true, '1-aleph': true }, 'Qal', true],
    ['אמר', { '1-aleph': true }, 'Qal', true],
    ['פלל', { 'geminate': false }, 'Qal', false],
    ['פלל', { 'geminate': true }, 'Qal', true],
    ['שׁים', { 'hollow': false }, 'Qal', false],
    ['שׁים', { 'hollow': true }, 'Qal', true],
    ['ראה', { 'strong': true }, 'Qal', false],
  ])('checkRootType(%s, %s, %s) = %s', (root, condition, stem, expected) => {
    const rootObj = { ...defaultRoot, root: root, types: getRootTypes(root) }
    const result = checkRootType(rootObj, condition as FilterCondition['root'], stem as Stem)
    expect(result).toBe(expected)
  })
})