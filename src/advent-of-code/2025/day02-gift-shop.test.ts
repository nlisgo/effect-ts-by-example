import { describe, expect, it } from '@jest/globals';
import { pipe } from 'effect';
import { repeats } from './day02-gift-shop';

describe('day02-gift-shop', () => {
  it.each([
    [11, true],
    [12, false],
    [222, false],
    [999, false],
    [998, false],
    [1010, true],
    [2121212121, false],
    [212121212121, true],
    [2121212118, false],
  ])('repeats (twice)', (input: number, expected: boolean) => {
    expect(pipe(
      input,
      repeats(true),
    )).toBe(expected);
  });

  it.each([
    [11, true],
    [12, false],
    [222, true],
    [999, true],
    [998, false],
    [1010, true],
    [2121212121, true],
    [2121212118, false],
  ])('repeats (multiple)', (input: number, expected: boolean) => {
    expect(pipe(
      input,
      repeats(),
    )).toBe(expected);
  });
});
