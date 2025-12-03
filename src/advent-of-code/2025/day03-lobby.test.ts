import { describe, expect, it } from '@jest/globals';
import { joltageTrim, largestPossibleJoltage } from './day03-lobby';

describe('day03-lobby', () => {
  it.each([
    [[9, 8, 7], undefined, [9, 8, 7]],
    [[9, 9, 7], undefined, [9, 9, 7]],
    [[8, 9, 7], undefined, [9, 7]],
    [[7, 8, 9], undefined, [9]],
    [[7, 8, 9], 2, [8, 9]],
    [[8, 9, 7], 3, [8, 9, 7]],
    [[1, 1, 8, 9, 7, 1, 1, 1, 1, 1, 1, 1], 12, [1, 1, 8, 9, 7, 1, 1, 1, 1, 1, 1, 1]],
  ])('joltageTrim', (input, length, expected) => {
    expect(joltageTrim(input, length)).toStrictEqual(expected);
  });

  it.each([
    ['987654321111111', 98],
  ])('largestPossibleJoltage', (input, expected) => {
    expect(largestPossibleJoltage()(input)).toBe(expected);
  });
});
