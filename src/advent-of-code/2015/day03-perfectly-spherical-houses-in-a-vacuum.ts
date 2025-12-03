import { type Error as PlatformError, FileSystem } from '@effect/platform';
import {
  Array,
  Console,
  Effect,
  pipe,
  Schema,
} from 'effect';

export const convertDirectionsToPositions = (directions: Array<string>): Array<Array<number>> => {
  let [x, y] = [0, 0];
  return [
    [x, y],
    ...directions.map((direction) => {
      switch (direction) {
        case '>':
          x += 1;
          break;
        case '<':
          x -= 1;
          break;
        case '^':
          y += 1;
          break;
        case 'v':
          y -= 1;
          break;
      }
      return [x, y];
    }),
  ];
};

export const readInput = (
  file: string,
): Effect.Effect<void, PlatformError.PlatformError, FileSystem.FileSystem> => pipe(
  Effect.flatMap(
    FileSystem.FileSystem,
    (fs) => fs.readFileString(file),
  ),
  Effect.map((input) => input.split('')),
  Effect.map(Array.filter(Schema.is(Schema.String.pipe(Schema.pattern(/^[\^><v]$/))))),
  Effect.map(convertDirectionsToPositions),
  Effect.tap((positions) => Console.log(`houses visited: ${positions.map(([x, y]) => `${x},${y}`).reduce<Array<string>>(
    (a, i) => {
      if (!a.includes(i)) {
        a.push(i);
      }
      return a;
    },
    [],
  ).length}`)),
  Effect.asVoid,
);
