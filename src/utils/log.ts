import { Console, Effect } from 'effect';

export const log = <A>(...m: ReadonlyArray<unknown>) => (v?: A): void => Effect.runSync(Effect.gen(function* () {
  yield* Console.log(...m, ...(v ? [v] : []));
}));
