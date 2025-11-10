import { HttpClient } from '@effect/platform';
import {
  Array, Console, Data, Effect, Either, pipe, Schema,
} from 'effect';
import { type ParseOptions } from 'effect/SchemaAST';
import type Link from 'http-link-header';
import { LinkHeader } from './services';

const schemaDecodeUnknown = (
  options?: ParseOptions,
) => <A>(schema: Schema.Schema<A>) => (u: unknown) => Schema.decodeUnknown(schema, options)(u);

const debugLevelSchema = Schema.Enums({
  BASIC: 'Basic',
  COAR_NOTIFICATION: 'COAR notification',
  COAR_NOTIFICATION_ESSENTIALS: 'COAR notification (essentials)',
  EVALUATION_HEADERS: 'Evaluation headers',
  EVALUATION_HEADERS_ESSENTIALS: 'Evaluation headers (essentials)',
  DOCMAP: 'DocMap',
  DOCMAP_ESSENTIALS: 'DocMap (essentials)',
} as const);

export const debugLevelValues = debugLevelSchema.enums;

type DebugLevel = Schema.Schema.Type<typeof debugLevelSchema>;

type DebugLevels = Array<DebugLevel>;

const notificationCodec = Schema.Struct({
  object: Schema.Struct({
    id: Schema.NonEmptyString,
  }),
});

const headersCodec = Schema.Struct({
  link: Schema.NonEmptyString,
});

const signpostingDocmapLinkCodec = Schema.Struct({
  uri: Schema.NonEmptyString,
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

export const docmapCodec = Schema.Struct({
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

class ValidationError extends Data.TaggedError('ValidationError')<{
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
  Effect.map(Array.map(schemaDecodeUnknown()(signpostingDocmapLinkCodec))),
  Effect.flatMap(
    Effect.forEach(Effect.either),
  ),
  Effect.map(
    Array.filterMap(Either.getRight),
  ),
  Effect.map(Array.head),
  Effect.flatMap(Either.fromOption(() => new ValidationError({ message: 'Header links array is empty' }))),
  Effect.map((ref) => ref.uri),
);

const retrieveDocmapFromSignpostingDocmapUri = (signpostingDocmapUri: string) => pipe(
  Effect.succeed(signpostingDocmapUri),
  Effect.flatMap(httpGetAndValidate(Schema.Array(docmapCodec))),
  Effect.map(Array.head),
  Effect.flatMap(Either.fromOption(() => new ValidationError({ message: 'DocMaps array is empty' }))),
);

const retrieveDocmapFromCoarNotificationUri = (
  coarNotificationUri: string,
) => pipe(
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

export const retrieveDocmapsFromCoarNotificationUris = (
  configs: ReadonlyArray<{ uuid: string, debug?: DebugLevels }>,
): Effect.Effect<
ReadonlyArray<Schema.Schema.Type<typeof docmapCodec> | { uuid: string, error: unknown }>,
never,
HttpClient.HttpClient | typeof Link
> => pipe(
  Effect.succeed(configs),
  Effect.flatMap(
    Effect.forEach(
      ({ uuid }) => pipe(
        retrieveDocmapFromCoarNotificationUri(`https://inbox-sciety-prod.elifesciences.org/inbox/urn:uuid:${uuid}`),
        Effect.tap((result) => Console.log({ uuid, result })),
        Effect.catchAll((error) => Effect.succeed({ uuid, error })),
      ),
    ),
  ),
);
