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

{
  const divide = (a: number, b: number): Effect.Effect<number, Error> => (b === 0 ? Effect.fail(new Error('Cannot divide by zero')) : Effect.succeed(a / b));

  const performDivide = (divideEffect: Effect.Effect<number, Error>) => Effect.runSync(divideEffect.pipe(
    Effect.tap(Console.log('Performing divide!!')),
    Effect.map((result) => `Result: ${result}`),
    Effect.tap(Console.log),
    Effect.catchAll((error) => Console.log(error)),
  ));

  performDivide(divide(1, 2));
  performDivide(divide(7, 3));
  performDivide(divide(1, 0));
}

{
  type User = {
    readonly id: number,
    readonly name: string,
  };

  // A mocked function to simulate fetching a user from a database
  const getUser = (userId: number): Effect.Effect<User, Error> => {
    // Normally, you would access a database or API here, but we'll mock it
    const userDatabase: Record<number, User> = {
      1: { id: 1, name: 'John Doe' },
      2: { id: 2, name: 'Jane Smith' },
    };

    // Check if the user exists in our "database" and return appropriately
    const user = userDatabase[userId];
    return (user) ? Effect.succeed(user) : Effect.fail(new Error(`User not found with userId: ${userId}`));
  };

  const successfulUserEffect = getUser(1);
  const unsuccessfulUserEffect = getUser(3);

  const retrieveUser = (userEffect: Effect.Effect<User, Error>) => Effect.runSync(userEffect.pipe(
    Effect.tap((user) => Console.log(`User found: ${user.name}`)),
    Effect.catchAll((error) => Console.log(error)),
  ));

  retrieveUser(successfulUserEffect);
  retrieveUser(unsuccessfulUserEffect);
}
