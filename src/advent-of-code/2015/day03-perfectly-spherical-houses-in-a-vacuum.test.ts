import { describe, expect, it } from '@jest/globals';
import { convertDirectionsToPositions } from './day03-perfectly-spherical-houses-in-a-vacuum';

describe('day03-perfectly-spherical-houses-in-a-vacuum', () => {
  it.each([
    ['>^^v'.split(''), [[0, 0], [1, 0], [1, 1], [1, 2], [1, 1]]],
  ])('convertDirectionsToPositions', (input, expected) => {
    expect(convertDirectionsToPositions(input)).toStrictEqual(expected);
  });
});
