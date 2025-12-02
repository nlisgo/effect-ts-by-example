import { describe, expect, it } from '@jest/globals';
import {
  type PerformRotation, performRotation, performRotations, relativePosition,
} from './day01-secret-entrance';

describe('day01-secret-entrance', () => {
  it.each([
    ['R0', 0],
    ['R1', 1],
    ['L1', -1],
    ['L0', 0],
    ['L68', -68],
    ['R99', 99],
  ])('relativePostion', (rotation: string, expected: number) => {
    expect(relativePosition(rotation)).toBe(expected);
  });

  it.each([
    [50, -49, { end: 1, zeros: 0 }],
    [50, -50, { end: 0, zeros: 1 }],
    [50, -68, { end: 82, zeros: 1 }],
    [50, -168, { end: 82, zeros: 2 }],
    [50, 49, { end: 99, zeros: 0 }],
    [50, 50, { end: 0, zeros: 1 }],
    [50, 68, { end: 18, zeros: 1 }],
    [50, 168, { end: 18, zeros: 2 }],
    [0, -5, { end: 95, zeros: 0 }],
    [99, -5, { end: 94, zeros: 0 }],
    [0, 5, { end: 5, zeros: 0 }],
    [1, 5, { end: 6, zeros: 0 }],
    [49, 5, { end: 54, zeros: 0 }],
  ])('performRotation', (start: number, rel: number, expected: PerformRotation) => {
    expect(performRotation(start, rel)).toStrictEqual(expected);
  });

  it.each([
    [
      50,
      [-68],
      [{ end: 50, zeros: 0 }, { end: 82, zeros: 1 }],
    ],
    [
      50,
      [-68, -30],
      [{ end: 50, zeros: 0 }, { end: 82, zeros: 1 }, { end: 52, zeros: 0 }],
    ],
    [
      50,
      [-68, -30, 48],
      [{ end: 50, zeros: 0 }, { end: 82, zeros: 1 }, { end: 52, zeros: 0 }, { end: 0, zeros: 1 }],
    ],
    [
      50,
      [-68, -30, 48, -5],
      [
        { end: 50, zeros: 0 },
        { end: 82, zeros: 1 },
        { end: 52, zeros: 0 },
        { end: 0, zeros: 1 },
        { end: 95, zeros: 0 },
      ],
    ],
  ])('performRotations', (start, rels, expected) => {
    expect(performRotations(start)(rels)).toStrictEqual(expected);
  });
});
