import { NodeFileSystem } from '@effect/platform-node';
import { Console, Effect } from 'effect';
import { readInput } from './day03-perfectly-spherical-houses-in-a-vacuum';

// See: https://adventofcode.com/2025/day/3

void Effect.runPromise(
  Effect.catchAllCause(
    readInput('src/advent-of-code/2015/day03-perfectly-spherical-houses-in-a-vacuum.in')
      .pipe(
        Effect.provide(NodeFileSystem.layer),
      ),
    (cause) => Console.log('Unexpected failure:', cause),
  ),
);
