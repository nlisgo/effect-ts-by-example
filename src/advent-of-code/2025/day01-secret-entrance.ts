import { type Error as PlatformError, FileSystem } from '@effect/platform';
import {
  Array, Effect, Number as EffectNumber, pipe, Schema,
} from 'effect';

export type PerformRotation = {
  end: number,
  zeros: number,
};

export const countEndsOnZero = (performs: ReadonlyArray<PerformRotation>): number => pipe(
  performs.slice(1),
  Array.filter(({ end }) => end === 0),
  Array.length,
);

export const countPassesZero = (performs: ReadonlyArray<PerformRotation>): number => pipe(
  performs.slice(1),
  Array.map(({ zeros }) => zeros),
  EffectNumber.sumAll,
);

export const performRotation = (start: number, relativePosition: number): PerformRotation => {
  const relativeEnd = (start + relativePosition);
  const distanceToZero = (relativePosition < 0) ? (start === 0 ? 100 : start) * -1 : 100 - start;
  const relativePositionAfterZero = relativePosition - distanceToZero;
  const fullRotationsAfterZero = Math.floor((
    relativePositionAfterZero < 0 ? relativePositionAfterZero * -1 : relativePositionAfterZero
  ) / 100);
  // console.log({
  //   start,
  //   relativePosition,
  //   distanceToZero,
  //   relativePositionAfterZero,
  //   fullRotationsAfterZero,
  // });
  const zeros = ((
    (relativePosition < 0 && relativePositionAfterZero <= 0)
    || (relativePosition >= 0 && relativePositionAfterZero >= 0)
  ) ? 1 : 0) + fullRotationsAfterZero;
  const end = relativeEnd % 100;
  return {
    end: end < 0 ? 100 + end : end,
    zeros,
  };
};

export const performRotations = (
  start: number,
) => (
  relativePositions: ReadonlyArray<number>,
): ReadonlyArray<PerformRotation> => {
  const performs = [
    {
      end: start,
      zeros: 0,
    },
  ];

  for (let i = 0; i < relativePositions.length; i += 1) {
    performs.push(performRotation(performs[i].end, relativePositions[i]));
  }

  return performs;
};

export const relativePosition = (rotation: string): number => pipe(
  rotation.replace(/(L|R)([0-9][0-9]*)/, '$1|$2').split('|'),
  ([direction, clicks]) => Number(clicks) * (clicks !== '0' && direction === 'L' ? -1 : 1),
);

export const readInput = (
  passingThroughZero: boolean = false,
): Effect.Effect<number, PlatformError.PlatformError, FileSystem.FileSystem> => pipe(
  'src/advent-of-code/2025/day01-secret-entrance.in',
  (input) => Effect.flatMap(
    FileSystem.FileSystem,
    (fs) => fs.readFileString(input),
  ),
  Effect.map((i) => i.split(/\n/)),
  Effect.map(Array.filter(Schema.is(Schema.String.pipe(Schema.pattern(/(L|R)[1-9][0-9]{0,}/))))),
  Effect.map(Array.map(relativePosition)),
  Effect.map(performRotations(50)),
  Effect.map(
    (rotations) => (passingThroughZero ? countPassesZero(rotations) : countEndsOnZero(rotations)),
  ),
);
