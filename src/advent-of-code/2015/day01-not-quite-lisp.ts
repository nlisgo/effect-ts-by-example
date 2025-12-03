import { type Error as PlatformError, FileSystem } from '@effect/platform';
import { Console, Effect, pipe } from 'effect';

export const movesToLevels = (
  { quitOnLevel }: { quitOnLevel?: number } = {},
) => (moves: Array<string>): Array<number> => {
  const levels: Array<number> = [];
  let level = 0;
  for (const move of moves) {
    level += move === '(' ? 1 : -1;
    levels.push(level);
    if (quitOnLevel !== undefined && level === quitOnLevel) {
      break;
    }
  }
  return levels;
};

export const readInput = (
  file: string,
): Effect.Effect<void, PlatformError.PlatformError, FileSystem.FileSystem> => pipe(
  Effect.flatMap(
    FileSystem.FileSystem,
    (fs) => fs.readFileString(file),
  ),
  Effect.map((moves) => moves.replaceAll(/[^()]/g, '')),
  Effect.tap((moves) => Console.log(`level: ${moves.replaceAll(')', '').length - moves.replaceAll('(', '').length}`)),
  Effect.map((moves) => moves.split('')),
  Effect.map(movesToLevels({ quitOnLevel: -1 })),
  Effect.tap((levels) => Console.log(`moves to level -1: ${levels.length}`)),
  Effect.asVoid,
);
