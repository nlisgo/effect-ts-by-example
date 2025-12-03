import { describe, expect, it } from '@jest/globals';
import {
  ribbonFromDimensions, slackFromDimensions, surfaceAreaFromDimensions, wrappingPaperFromDimensions,
} from './day02-i-was-told-there-would-be-no-math';

describe('day02-i-was-told-there-would-be-no-math', () => {
  it.each([
    [2, 3, 4, 52],
    [1, 1, 10, 42],
  ])('surfaceAreaFromDimensions', (l, w, h, expected) => {
    expect(surfaceAreaFromDimensions(l, w, h)).toBe(expected);
  });

  it.each([
    [2, 3, 4, 6],
    [1, 1, 10, 1],
  ])('slackFromDimensions', (l, w, h, expected) => {
    expect(slackFromDimensions(l, w, h)).toBe(expected);
  });

  it.each([
    [2, 3, 4, 58],
    [1, 1, 10, 43],
  ])('wrappingPaperFromDimensions', (l, w, h, expected) => {
    expect(wrappingPaperFromDimensions(l, w, h)).toBe(expected);
  });

  it.each([
    [2, 3, 4, 34],
    [1, 1, 10, 14],
  ])('ribbonFromDimensions', (l, w, h, expected) => {
    expect(ribbonFromDimensions(l, w, h)).toBe(expected);
  });
});
