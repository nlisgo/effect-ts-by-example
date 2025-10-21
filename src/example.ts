import { Effect, Console } from 'effect';

// Basic Effect example
const program = Effect.gen(function* () {
  yield* Console.log('Hello from Effect-TS!');

  const result = yield* Effect.succeed(42);
  yield* Console.log(`The answer is: ${result}`);

  return result;
});

void Effect.runPromise(program.pipe(
  Effect.tap((result) => Console.log(`Program completed with result: ${result}`)),
  Effect.catchAll((error) => Console.log('Program failed:', error)),
));
