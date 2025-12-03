import { NodeFileSystem } from '@effect/platform-node';
import { Console, Effect } from 'effect';
import { readInput } from './day03-lobby';

// See: https://adventofcode.com/2025/day/3

void Effect.runPromise(
  Effect.catchAllCause(
    readInput('src/advent-of-code/2025/day03-lobby.in').pipe(Effect.provide(NodeFileSystem.layer)),
    (cause) => Console.log('Unexpected failure:', cause),
  ),
);
