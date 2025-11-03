import { FetchHttpClient, HttpClient } from '@effect/platform';
import {
  Array, Console, Data, Effect, Either, Option, pipe, Schema,
} from 'effect';
import parseLinkHeader from 'parse-link-header';

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

const notificationCodec = Schema.Struct({
  object: Schema.Struct({
    id: Schema.String,
  }),
});

const headersCodec = Schema.Struct({
  link: Schema.String,
});

const parsedLinkCodec = Schema.Struct({
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

const httpRequestAndValidate = <Resp, E1, R1, Body, E2, R2>(
  request: (uri: string) => Effect.Effect<Resp, E1, R1>,
  extract: (resp: Resp) => Effect.Effect<Body, E2, R2>,
) => <A, I = unknown, Req = never>(schema: Schema.Schema<A, I, Req>) => (uri: string) => Effect.gen(function* () {
    const raw = yield* request(uri);
    const data = yield* extract(raw);
    return yield* Schema.decodeUnknown(schema)(data);
  });

const httpGetAndValidate = httpRequestAndValidate(
  (uri) => HttpClient.get(uri),
  (res) => res.json,
);

const httpHeadAndValidate = httpRequestAndValidate(
  (uri) => HttpClient.head(uri),
  (res) => Effect.sync(() => res.headers),
);

const normaliseLinkHeader = (raw: string) => raw
  .replace(/>\s*;\s*/g, '>; ')
  .replace(/(?<!;)\s+(?=(type|profile|title|rev)=)/g, '; ')
  .replace(/;\s*;/g, '; ')
  .trim()
  .split(', ');

class NonEmptyArrayError extends Data.TaggedError('NonEmptyArrayError')<{
  message: string,
}> {}

const retrieveAnnouncementActionUriFromCoarNotificationUri = (notificationUri: string) => pipe(
  notificationUri,
  httpGetAndValidate(notificationCodec),
  Effect.map((notification) => notification.object.id),
  Effect.tap((announcementActionUri) => Console.log(`Step 1: retrieved evaluation uri: ${announcementActionUri}`)),
);

const retrieveSignpostingDocmapUriFromAnnouncementActionUri = (announcementActionUri: string) => pipe(
  announcementActionUri,
  httpHeadAndValidate(headersCodec),
  Effect.map((headers) => headers.link),
  Effect.map(normaliseLinkHeader),
  Effect.map(Array.map(parseLinkHeader)),
  Effect.map(Array.filterMap(Option.fromNullable)),
  Effect.flatMap(
    (links) => Effect.forEach(
      links, (link) => Effect.either(
        Schema.decodeUnknown(parsedLinkCodec)(link),
      ),
    ),
  ),
  Effect.map((links) => Array.filterMap(links, Either.getRight)),
  Effect.map(Array.last),
  Effect.flatMap(
    (opt) => (Option.isSome(opt)
      ? Effect.succeed(opt.value)
      : Effect.fail(new NonEmptyArrayError({ message: 'Header links array is empty' }))),
  ),
  Effect.map((link) => link.describedby.url),
  Effect.tap((signpostingDocmapUri) => Console.log(`Step 2: retrieved DocMap uri: ${signpostingDocmapUri}`)),
);

const retrieveDocmapFromSignpostingDocmapUri = (signpostingDocmapUri: string) => pipe(
  signpostingDocmapUri,
  httpGetAndValidate(docmapsCodec),
  Effect.map(Array.head),
  Effect.flatMap(
    (opt) => (Option.isSome(opt)
      ? Effect.succeed(opt.value)
      : Effect.fail(new NonEmptyArrayError({ message: 'DocMaps array is empty' }))),
  ),
);

const retrieveDocmapFromCoarNotificationUri = (coarNotificationUri: string) => pipe(
  coarNotificationUri,
  retrieveAnnouncementActionUriFromCoarNotificationUri,
  Effect.flatMap(retrieveSignpostingDocmapUriFromAnnouncementActionUri),
  Effect.flatMap(retrieveDocmapFromSignpostingDocmapUri),
);

const retrieveDocmapsFromCoarNotificationUris = (configs: ReadonlyArray<{ uuid: string, debug?: DebugLevels }>) => pipe(
  configs,
  Effect.forEach(({ uuid }) => pipe(
    retrieveDocmapFromCoarNotificationUri(`https://inbox-sciety-prod.elifesciences.org/inbox/urn:uuid:${uuid}`),
    Effect.either,
    Effect.map((result) => ({ uuid, result })),
  )),
);

const app = pipe(
  retrieveDocmapsFromCoarNotificationUris([
    {
      uuid: 'bf3513ee-1fef-4f30-a61b-20721b505f11',
    },
    {
      uuid: '9154949f-6da4-4f16-8997-a0762f19b05a',
    },
    {
      uuid: '7140557f-6fe6-458f-ad59-21a9d53c8eb2',
      debug: [
        debugLevelValues.EVALUATION_HEADERS,
      ],
    },
  ]),
  Effect.provide(FetchHttpClient.layer),
  Effect.flatMap((results) => pipe(
    Effect.forEach(
      results,
      ({ uuid, result }) => pipe(
        result,
        Either.match({
          onLeft: (error) => Console.error(`Error retrieving docmap for ${uuid}:`, error),
          onRight: (docmap) => Console.log(`DocMap for ${uuid}:`, docmap),
        }),
      ),
    ),
    Effect.asVoid,
  )),
);

void Effect.runPromise(
  Effect.catchAllCause(app, (cause) => Console.log('Unexpected failure:', cause)),
);
