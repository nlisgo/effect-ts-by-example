import { FetchHttpClient, HttpClient } from '@effect/platform';
import {
  Array, Console, Data, Effect, Either, Option, pipe, Schema,
} from 'effect';
import { LinkHeader, LinkHeaderLive } from './services';

const debugLevelSchema = Schema.Enums({
  BASIC: 'Basic',
  COAR_NOTIFICATION: 'COAR notification',
  COAR_NOTIFICATION_ESSENTIALS: 'COAR notification (essentials)',
  EVALUATION_HEADERS: 'Evaluation headers',
  EVALUATION_HEADERS_ESSENTIALS: 'Evaluation headers (essentials)',
  DOCMAP: 'DocMap',
  DOCMAP_ESSENTIALS: 'DocMap (essentials)',
} as const);

const debugLevelValues = debugLevelSchema.enums;

type DebugLevel = Schema.Schema.Type<typeof debugLevelSchema>;

type DebugLevels = Array<DebugLevel>;

const notificationCodec = Schema.Struct({
  object: Schema.Struct({
    id: Schema.String,
  }),
});

const headersCodec = Schema.Struct({
  link: pipe(
    Schema.String,
    Schema.filter(
      (l) => [
        /<http[^>]+>/.test(l),
        /(^|\s)rel="describedbywtf"/.test(l),
        /(^|\s)profile="https:\/\/w3id.org\/docmaps\/context.jsonld"/.test(l),
      ].every(Boolean),
    ),
  ),
});

const signpostingDocmapLinkCodec = Schema.Struct({
  uri: Schema.String,
  rel: Schema.Literal('describedby'),
  type: Schema.Literal('application/ld+json'),
  profile: Schema.Literal('https://w3id.org/docmaps/context.jsonld'),
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

class NonEmptyArrayError extends Data.TaggedError('NonEmptyArrayError')<{
  message: string,
}> {}

const retrieveAnnouncementActionUriFromCoarNotificationUri = (notificationUri: string) => pipe(
  Effect.succeed(notificationUri),
  Effect.flatMap(httpGetAndValidate(notificationCodec)),
  Effect.map((notification) => notification.object.id),
);

const retrieveSignpostingDocmapUriFromAnnouncementActionUri = (announcementActionUri: string) => pipe(
  Effect.succeed(announcementActionUri),
  Effect.flatMap(httpHeadAndValidate(headersCodec)),
  Effect.map(({ link }) => link),
  Effect.flatMap(LinkHeader.parse),
  Effect.map(({ refs }) => refs),
  Effect.flatMap(
    (refs) => Effect.forEach(
      refs, (ref) => Effect.either(
        Schema.decodeUnknown(signpostingDocmapLinkCodec)(ref),
      ),
    ),
  ),
  Effect.map((refs) => Array.filterMap(refs, Either.getRight)),
  Effect.map(Array.last),
  Effect.flatMap(
    (opt) => (Option.isSome(opt)
      ? Effect.succeed(opt.value)
      : Effect.fail(new NonEmptyArrayError({ message: 'Header links array is empty' }))),
  ),
  Effect.map((ref) => ref.uri),
);

const retrieveDocmapFromSignpostingDocmapUri = (signpostingDocmapUri: string) => pipe(
  Effect.succeed(signpostingDocmapUri),
  Effect.flatMap(httpGetAndValidate(docmapsCodec)),
  Effect.map(Array.head),
  Effect.flatMap(
    (opt) => (Option.isSome(opt)
      ? Effect.succeed(opt.value)
      : Effect.fail(new NonEmptyArrayError({ message: 'DocMaps array is empty' }))),
  ),
);

const retrieveDocmapFromCoarNotificationUri = (coarNotificationUri: string) => pipe(
  Effect.succeed(coarNotificationUri),
  Effect.tap(Console.log(`(1a) retrieve action announcement uri from COAR notification uri: ${coarNotificationUri}`)),
  Effect.flatMap(retrieveAnnouncementActionUriFromCoarNotificationUri),
  Effect.tapBoth({
    onSuccess: (announcementActionUri) => Console.log(`(1b) retrieved action announcement uri: ${announcementActionUri}`),
    onFailure: (error) => Console.log(`(1b) failure to retrieve action announcement uri: ${error.message}`, error),
  }),
  Effect.tap((announcementActionUri) => Console.log(`(2a) retrieve signposting DocMap uri from action announcement uri: ${announcementActionUri}`)),
  Effect.flatMap(retrieveSignpostingDocmapUriFromAnnouncementActionUri),
  Effect.tapBoth({
    onSuccess: (signpostingDocmapUri) => Console.log(`(2b) retrieved signposting DocMap uri: ${signpostingDocmapUri}`),
    onFailure: (error) => Console.log(`(2b) failure to retrieve signposting DocMap uri: ${error.message}`, error),
  }),
  Effect.flatMap(retrieveDocmapFromSignpostingDocmapUri),
);

const retrieveDocmapsFromCoarNotificationUris = (configs: ReadonlyArray<{ uuid: string, debug?: DebugLevels }>) => pipe(
  Effect.succeed(configs),
  Effect.flatMap(
    Effect.forEach(({ uuid }) => pipe(
      retrieveDocmapFromCoarNotificationUri(`https://inbox-sciety-prod.elifesciences.org/inbox/urn:uuid:${uuid}`),
      Effect.tap((result) => Console.log({ uuid, result })),
      Effect.catchAll((error) => Effect.succeed({ uuid, error })),
    )),
  ),
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
);

void Effect.runPromise(
  Effect.catchAllCause(app.pipe(
    Effect.provide(FetchHttpClient.layer),
    Effect.provide(LinkHeaderLive),
  ), (cause) => Console.log('Unexpected failure:', cause)),
);
