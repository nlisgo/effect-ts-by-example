import { NodeFileSystem } from '@effect/platform-node';
import { Console, Effect } from 'effect';
import { readInput } from './day01-secret-entrance';

// See: https://adventofcode.com/2025/day/1

void Effect.runPromise(
  Effect.catchAllCause(
    readInput('src/advent-of-code/2025/day01-secret-entrance.in', false)
      .pipe(
        Effect.map((result) => `Landing on zero: ${result}`),
        Effect.tap(Console.log),
      )
      .pipe(
        Effect.provide(NodeFileSystem.layer),
      ),
    (cause) => Console.log('Unexpected failure:', cause),
  ),
);

void Effect.runPromise(
  Effect.catchAllCause(
    readInput('src/advent-of-code/2025/day01-secret-entrance.in', true)
      .pipe(
        Effect.map((result) => `Passing through zero: ${result}`),
        Effect.tap(Console.log),
      )
      .pipe(
        Effect.provide(NodeFileSystem.layer),
      ),
    (cause) => Console.log('Unexpected failure:', cause),
  ),
);
