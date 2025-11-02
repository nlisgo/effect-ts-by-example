import { FetchHttpClient, HttpClient } from '@effect/platform';
import { Console, Effect, pipe } from 'effect';
import * as A from 'effect/Array';
import * as E from 'effect/Either';
import * as O from 'effect/Option';
import * as S from 'effect/Schema';
import parseLinkHeader from 'parse-link-header';
import { log } from './utils/log';

const debugLevelValues = {
  BASIC: 'Basic',
  COAR_NOTIFICATION: 'COAR notification',
  COAR_NOTIFICATION_ESSENTIALS: 'COAR notification (essentials)',
  EVALUATION_HEADERS: 'Evaluation headers',
  EVALUATION_HEADERS_ESSENTIALS: 'Evaluation headers (essentials)',
  DOCMAP: 'DocMap',
  DOCMAP_ESSENTIALS: 'DocMap (essentials)',
} as const;

type DebugLevel = typeof debugLevelValues[keyof typeof debugLevelValues];

type DebugLevels = Array<DebugLevel>;

type Item = string | number;

const jsonStringify = (data: unknown) => JSON.stringify(data, null, 2);

const notificationCodec = S.Struct({
  object: S.Struct({
    id: S.String,
  }),
});

const headersCodec = S.Struct({
  link: S.String,
});

const parsedLinkCodec = S.Struct({
  describedby: S.Struct({
    url: S.String,
    type: S.Literal('application/ld+json'),
  }),
});

const stepCodec = S.extend(
  S.Struct({
    inputs: S.Array(
      S.Struct({
        doi: S.String,
      }),
    ),
    actions: S.Array(
      S.Struct({
        outputs: S.Array(
          S.Struct({
            published: S.String,
            doi: S.String,
            type: S.String,
          }),
        ),
        inputs: S.Array(
          S.Struct({
            doi: S.String,
          }),
        ),
      }),
    ),
  }),
  S.partial(S.Struct({
    'next-step': S.String,
    'previous-step': S.String,
  })),
);

const stepsCodec = S.Record({
  key: S.String,
  value: stepCodec,
});

const docmapCodec = S.Struct({
  type: S.Literal('docmap'),
  id: S.String,
  publisher: S.Struct({
    name: S.String,
    url: S.String,
  }),
  created: S.String,
  updated: S.String,
  'first-step': S.Literal('_:b0'),
  steps: stepsCodec,
  '@context': S.String,
});

const docmapsCodec = S.Array(docmapCodec);

const normaliseLinkHeader = (raw: string) => pipe(
  raw
    .replace(/>\s*;\s*/g, '>; ')
    .replace(/(?<!;)\s+(?=(type|profile|title|rev)=)/g, '; ')
    .replace(/;\s*;/g, '; ')
    .trim()
    .split(', '),
  A.map(parseLinkHeader),
  A.filterMap(O.fromNullable), // drops nulls, keeps typed Link[]
);

const httpGetAndValidate = <A, I = unknown, R = never>(
  schema: S.Schema<A, I, R>,
) => (uri: string) => Effect.gen(function* () {
    const response = yield* HttpClient.get(uri);
    const data = yield* response.json;
    return yield* S.decodeUnknown(schema)(data);
  });

const httpHeadAndValidate = <A, I = unknown, R = never>(
  schema: S.Schema<A, I, R>,
) => (uri: string) => Effect.gen(function* () {
    const response = yield* HttpClient.head(uri);
    return yield* S.decodeUnknown(schema)(response.headers);
  });

void (async () => {
  log(
    await Effect.runPromise(
      pipe(
        'https://inbox-sciety-prod.elifesciences.org/inbox/urn:uuid:bf3513ee-1fef-4f30-a61b-20721b505f11',
        httpGetAndValidate(notificationCodec),
        Effect.map((notification) => notification.object.id),
        Effect.tap((uri) => Console.log(`Step 1: retrieved evaluation uri: ${uri}`)),
        Effect.flatMap(httpHeadAndValidate(headersCodec)),
        Effect.map((headers) => headers.link),
        Effect.map(normaliseLinkHeader),
        Effect.flatMap(
          (links) => Effect.forEach(
            links, (link) => Effect.either(
              S.decodeUnknown(parsedLinkCodec)(link),
            ),
          ),
        ),
        Effect.map((links) => A.filterMap(links, E.getRight)),
        Effect.map(A.last),
        Effect.flatMap(
          (opt) => (O.isSome(opt)
            ? Effect.succeed(opt.value)
            : Effect.fail(new Error('Header links array is empty'))),
        ),
        Effect.map((link) => link.describedby.url),
        Effect.tap((uri) => Console.log(`Step 2: retrieved DocMap uri: ${uri}`)),
        Effect.flatMap(httpGetAndValidate(docmapsCodec)),
        Effect.map(A.head),
        Effect.flatMap(
          (opt) => (O.isSome(opt)
            ? Effect.succeed(opt.value)
            : Effect.fail(new Error('DocMaps array is empty'))),
        ),
        Effect.provide(FetchHttpClient.layer),
      ),
    )
      .catch((err) => console.error('Error:', err)),
  )();
})();
