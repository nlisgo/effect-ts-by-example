import { NodeFileSystem } from '@effect/platform-node';
import { Console, Effect } from 'effect';
import { readInput } from './day02-i-was-told-there-would-be-no-math';

// See: https://adventofcode.com/2025/day/2

void Effect.runPromise(
  Effect.catchAllCause(
    readInput('src/advent-of-code/2015/day02-i-was-told-there-would-be-no-math.in')
      .pipe(
        Effect.provide(NodeFileSystem.layer),
      ),
    (cause) => Console.log('Unexpected failure:', cause),
  ),
);
