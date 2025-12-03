import { describe, expect, it } from '@jest/globals';
import { movesToLevels } from './day01-not-quite-lisp';

describe('day01-no-lisp', () => {
  it.each([
    ['(())'.split(''), [1, 2, 1, 0]],
  ])('movesToLevels', (input, expected) => {
    expect(movesToLevels()(input)).toStrictEqual(expected);
  });
});
