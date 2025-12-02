import { NodeFileSystem } from '@effect/platform-node';
import { Console, Effect } from 'effect';
import { readInput } from './day02-gift-shop';

// See: https://adventofcode.com/2025/day/2

void Effect.runPromise(
  Effect.catchAllCause(
    readInput()
      .pipe(
        Effect.provide(NodeFileSystem.layer),
      ),
    (cause) => Console.log('Unexpected failure:', cause),
  ),
);
