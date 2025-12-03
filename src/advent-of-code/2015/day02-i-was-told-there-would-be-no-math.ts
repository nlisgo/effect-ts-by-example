import { type Error as PlatformError, FileSystem } from '@effect/platform';
import {
  Array,
  Console,
  Effect,
  Number as EffectNumber,
  pipe,
} from 'effect';

export const surfaceAreaFromDimensions = (
  l: number, w: number, h: number,
): number => 2 * ((l * w) + (l * h) + (w * h));

export const slackFromDimensions = (
  l: number, w: number, h: number,
): number => Math.min(l * w, l * h, w * h);

export const wrappingPaperFromDimensions = (
  l: number, w: number, h: number,
): number => surfaceAreaFromDimensions(l, w, h) + slackFromDimensions(l, w, h);

export const ribbonFromDimensions = (
  l: number, w: number, h: number,
): number => Math.min(2 * l + 2 * w, 2 * l + 2 * h, 2 * w + 2 * h) + l * w * h;

export const readInput = (
  file: string,
): Effect.Effect<void, PlatformError.PlatformError, FileSystem.FileSystem> => pipe(
  Effect.flatMap(
    FileSystem.FileSystem,
    (fs) => fs.readFileString(file),
  ),
  Effect.map((dimensions) => dimensions.split('\n').map((line) => line.split('x').map(Number))),
  Effect.map(Array.filter((d) => d.length === 3)),
  Effect.tap(
    (p) => Console.log(`Wrapping paper required: ${EffectNumber.sumAll(Array.map(([l, w, h]) => wrappingPaperFromDimensions(l, w, h))(p))}`),
  ),
  Effect.tap(
    (p) => Console.log(`Ribbon required: ${EffectNumber.sumAll(Array.map(([l, w, h]) => ribbonFromDimensions(l, w, h))(p))}`),
  ),
  Effect.asVoid,
);
