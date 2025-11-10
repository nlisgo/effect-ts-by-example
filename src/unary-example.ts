import {
  Array, Effect, Either, pipe, Schema,
} from 'effect';
import { type ParseOptions } from 'effect/SchemaAST';

const schemaDecodeUnknown = (
  options?: ParseOptions,
) => <A>(schema: Schema.Schema<A>) => (u: unknown) => Schema.decodeUnknown(schema, options)(u);

const items = [
  {
    a: 'a',
    b: 1,
  },
  {
    a: 'b',
    b: '2',
  },
  {
    a: 3,
    b: 3,
  },
  {
    a: 'd',
    b: 4,
  },
];

const itemCodec = Schema.Struct({
  a: Schema.String,
  b: Schema.Number,
});

const exampleOne = (unknownItems: Array<unknown>) => pipe(
  unknownItems,
  Array.map((item) => Schema.decodeUnknown(itemCodec)(item)),
  Effect.forEach(Effect.either),
  Effect.map(Array.filterMap(Either.getRight)),
);

const exampleTwo = (unknownItems: Array<unknown>) => pipe(
  unknownItems,
  Array.map(schemaDecodeUnknown()(itemCodec)),
  Effect.forEach(Effect.either),
  Effect.map(Array.filterMap(Either.getRight)),
);

const exampleThree = (unknownItems: Array<unknown>) => pipe(
  unknownItems,
  Array.filter(Schema.is(itemCodec)),
);

void Effect.runSync(exampleOne(items).pipe(Effect.map(console.log)));

void Effect.runSync(exampleTwo(items).pipe(Effect.map(console.log)));

console.log(exampleThree(items));
