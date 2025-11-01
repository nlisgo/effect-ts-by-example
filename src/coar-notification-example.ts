import { FetchHttpClient, HttpClient } from '@effect/platform';
import { Effect, Schema } from 'effect';
import { log } from './utils/log';

enum DebugLevelValues {
  BASIC,
  EVALUATION_HEADERS,
  DOCMAP_ESSENTIAL,
  DOCMAP_COMPLETE,
}

type DebugLevel = DebugLevelValues;

type DebugLevels = Array<DebugLevel>;

type Item = string | number;

const jsonStringify = (data: unknown) => JSON.stringify(data, null, 2);

const debugLog = (message: string, debug: DebugLevels, debugLevel: DebugLevel, item: Item) => {
  if (debug.includes(debugLevel)) {
    return log(message)(`(Debug level: ${debugLevel}) [item: ${item}]`);
  }
};

const notificationCodec = Schema.Struct({
  object: Schema.Struct({
    id: Schema.String,
  }),
});

const headersLinkCodec = Schema.Struct({
  link: Schema.String,
});

const parsedHeadersLinkCodec = Schema.Struct({
  describedby: Schema.Struct({
    url: Schema.String,
    type: Schema.Literal('application/ld+json'),
  }),
});

const stepCodec = Schema.extend(
  Schema.Struct({
    inputs: Schema.Array(
      Schema.Struct({
        doi: Schema.String,
      }),
    ),
    actions: Schema.Array(
      Schema.Struct({
        outputs: Schema.Array(
          Schema.Struct({
            published: Schema.String,
            doi: Schema.String,
            type: Schema.String,
          }),
        ),
        inputs: Schema.Array(
          Schema.Struct({
            doi: Schema.String,
          }),
        ),
      }),
    ),
  }),
  Schema.partial(Schema.Struct({
    'next-step': Schema.String,
    'previous-step': Schema.String,
  })),
);

const stepsCodec = Schema.Record({
  key: Schema.String,
  value: stepCodec,
});

const docmapCodec = Schema.Struct({
  type: Schema.Literal('docmap'),
  id: Schema.String,
  publisher: Schema.Struct({
    name: Schema.String,
    url: Schema.String,
  }),
  created: Schema.String,
  updated: Schema.String,
  'first-step': Schema.Literal('_:b0'),
  steps: stepsCodec,
  '@context': Schema.String,
});

const docmapsCodec = Schema.Array(docmapCodec);

const httpGetRequest = (uri: string) => Effect.gen(function* () {
  const response = yield* HttpClient.get(uri);
  return yield* response.json;
});

void (async () => {
  log(
    await Effect.runPromise(
      httpGetRequest('https://inbox-sciety-prod.elifesciences.org/inbox/urn:uuid:bf3513ee-1fef-4f30-a61b-20721b505f11').pipe(
        Effect.provide(FetchHttpClient.layer),
      ),
    )
      .catch((err) => console.error('Error:', err)),
  )();
})();
