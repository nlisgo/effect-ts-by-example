import { type Error as PlatformError, FileSystem } from '@effect/platform';
import {
  Array, Console, Effect, Number as EffectNumber, pipe,
} from 'effect';

export const joltageTrim = (input: Array<number>, minLength: number = 1): Array<number> => {
  const inputTrimmed = minLength > 1 ? input.slice(0, (minLength - 1) * -1) : input;
  const m = Math.max(...inputTrimmed);
  const mIndex = input.indexOf(m);
  return input.slice(mIndex);
};

export const largestPossibleJoltage = (length: number = 2) => (input: string): number => {
  const j: Array<number> = [];
  let scope = input.split('').map(Number);
  for (let i = length; i > 0; i -= 1) {
    const [n, ...s] = joltageTrim(scope, i);
    j.push(n);
    scope = s;
  }

  return Number(j.map((n) => n.toString()).join(''));
};

export const readInput = (
  file: string,
): Effect.Effect<void, PlatformError.PlatformError, FileSystem.FileSystem> => pipe(
  Effect.flatMap(FileSystem.FileSystem, (fs) => fs.readFileString(file)),
  Effect.map((i) => i.split(/\n/)),
  Effect.map(Array.filter((i) => i.length > 0)),
  Effect.tap((batteries) => Console.log(`sum 2: ${EffectNumber.sumAll(Array.map(largestPossibleJoltage(2))(batteries))}`)),
  Effect.tap((batteries) => Console.log(`sum 12: ${EffectNumber.sumAll(Array.map(largestPossibleJoltage(12))(batteries))}`)),
  Effect.asVoid,
);
