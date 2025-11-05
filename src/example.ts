import { Effect, Console, pipe } from 'effect';

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

  // Effect.gen version of performDivide
  const performDivideGen = (divideEffect: Effect.Effect<number, Error>) => Effect.runSync(Effect.gen(function* () {
    const result = yield* divideEffect;
    return `Result: ${result}`;
  }).pipe(
    Effect.catchAll((error) => Console.log(error)),
  ));

  performDivide(divide(1, 2));
  performDivide(divide(7, 3));
  performDivide(divide(1, 0));
  performDivideGen(divide(1, 2));
  performDivideGen(divide(7, 3));
  performDivideGen(divide(1, 0));
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

{
  // Define simple arithmetic operations
  const increment = (x: number) => x + 1;
  const double = (x: number) => x * 2;
  const subtractTen = (x: number) => x - 10;

  // Sequentially apply these operations using `pipe`
  const result = pipe(5, increment, double, subtractTen);
  Effect.runSync(Console.log(`Result: ${result}`));
}

const divide = (
  a: number,
  b: number,
): Effect.Effect<number, Error, never> => (b === 0
  ? Effect.fail(new Error('Cannot divide by zero'))
  : Effect.succeed(a / b));

Effect.runSync(Console.log(divide(27, 3)));
Effect.runSync(Console.log(divide(27, 4)));
Effect.runSync(Console.log(divide(27, 0)));

// Synchronous function that can't fail
const simpleLog = (message: string): Effect.Effect<void, never, never> => Effect.sync(() => console.log(message));

// Asynchronous function that can't fail
const delay = (message: string): Effect.Effect<string, never, never> => Effect.promise<string>(
  async () => new Promise((resolve) => {
    setTimeout(() => {
      resolve(message);
    }, 2000);
  }),
);

// Synchronous function that can fail
const parse = (input: string): Effect.Effect<unknown, Error, never> => Effect.try({
  // JSON.parse may throw for bad input
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  try: () => JSON.parse(input),
  // remap the error
  catch: () => new Error('something went wrong while parsing the JSON'),
});

// Asynchronous function that can fail
const getTodo = (id: number): Effect.Effect<Response, Error, never> => Effect.tryPromise({
  // fetch can throw for network errors
  try: async () => fetch(`https://jsonplaceholder.typicode.com/todos/${id}`),
  // remap the error
  catch: (unknown) => new Error(`something went wrong ${unknown}`),
});

// log(Effect.runPromise(pipe(delay('Hello, World!'), console.log)))();
