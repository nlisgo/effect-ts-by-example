import { type Error as PlatformError, FileSystem } from '@effect/platform';
import {
  Array, Console, Effect, Number as EffectNumber, Option, pipe,
} from 'effect';

export const repeats = (twiceOnly: boolean = false) => (input: number): boolean => {
  const s = input.toString();

  if (twiceOnly) {
    const inputStr = input.toString();
    return inputStr.length % 2 === 0
      && inputStr === inputStr.slice(0, inputStr.length / 2).repeat(2);
  }

  for (let i = 1; i <= s.length / 2; i += 1) {
    if (s.length % i === 0 && Number(s.slice(0, i).repeat(s.length / i)) === input) {
      return true;
    }
  }

  return false;
};

export const readInput = (
  file: string,
): Effect.Effect<void, PlatformError.PlatformError, FileSystem.FileSystem> => pipe(
  Effect.flatMap(
    FileSystem.FileSystem,
    (fs) => fs.readFileString(file),
  ),
  Effect.map((i) => i.split(/\n/)),
  Effect.map(Array.head),
  Effect.map(Option.getOrElse(() => '')),
  Effect.map((i) => i.split(/,/)),
  Effect.map(Array.map((i) => i.split('-'))),
  Effect.map(Array.map(Array.map(Number))),
  Effect.map(Array.flatMap(([i1, i2]) => Array.range(i1, i2))),
  Effect.map(Array.map((value) => ({
    value,
    repeats: repeats()(value),
  }))),
  Effect.map(Array.filter((i) => i.repeats)),
  Effect.tap((v) => Console.log(`multiple: ${EffectNumber.sumAll(v.map(({ value }) => value))}`)),
  Effect.map(Array.map(({ value }) => ({
    value,
    repeats: repeats(true)(value),
  }))),
  Effect.map(Array.filter((i) => i.repeats)),
  Effect.tap((v) => Console.log(`twice: ${EffectNumber.sumAll(v.map(({ value }) => value))}`)),
  Effect.asVoid,
);
