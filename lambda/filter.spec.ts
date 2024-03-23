import { FilterCondition, checkRoot } from './filter'

describe('checkRoot', () => {
  it('should return true when all conditions are met', () => {
    const root = 'אבג'
    const condition = {
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
    const result = checkRoot(root, condition)
    expect(result).toBe(true)
  })

  it.each([
    ['אכל', { '1-gutteral': true }, false],
    ['אכל', { '1-gutteral': true, '1-aleph': true }, true],
    ['אמר', { '1-aleph': true }, true],
    ['פלל', { 'geminate': false }, false],
    ['פלל', { 'geminate': true }, true],
  ])('returns %s when root = %s, condition = %s', (root, condition, expected) => {
    const result = checkRoot(root, condition as FilterCondition['root'])
    expect(result).toBe(expected)
  })
})