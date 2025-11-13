import { HttpClient } from '@effect/platform';
import {
  Array, Console, Data, Effect, Either, pipe, Schema,
} from 'effect';
import type Link from 'http-link-header';
import { LinkHeader } from './services';

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

const stepCodec = Schema.Struct({
  actions: Schema.NonEmptyArray(Schema.Struct({
    outputs: Schema.NonEmptyArray(
      Schema.Struct({
        published: Schema.String,
        doi: Schema.String,
        type: Schema.Union(
          Schema.Literal('editorial-decision'),
          Schema.Literal('review'),
          Schema.Literal('reply'),
        ),
      }),
    ),
    inputs: Schema.NonEmptyArray(
      Schema.Struct({
        published: Schema.String,
        doi: Schema.String,
        type: Schema.Literal('preprint'),
      }),
    ),
  })),
  assertions: Schema.NonEmptyArray(
    Schema.Struct({
      status: Schema.Literal('reviewed'),
      item: Schema.String,
    }),
  ),
});

const docmapCodec = Schema.Struct({
  steps: Schema.Record({
    key: Schema.String,
    value: Schema.Unknown,
  }),
});

const docmapsCodec = Schema.NonEmptyArray(Schema.Unknown);

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
  Effect.map(Array.findFirst(Schema.is(signpostingDocmapLinkCodec))),
  Effect.flatMap(Either.fromOption(() => new ValidationError({ message: 'Header links array is empty' }))),
  Effect.map((ref) => ref.uri),
);

const retrieveActionDoiFromSignpostingDocmapUri = (signpostingDocmapUri: string) => pipe(
  Effect.succeed(signpostingDocmapUri),
  Effect.flatMap(httpGetAndValidate(docmapsCodec)),
  Effect.map(Array.findFirst(Schema.is(docmapCodec))),
  Effect.flatMap(Either.fromOption(() => new ValidationError({ message: 'DocMaps array is empty' }))),
  Effect.map((docmap) => docmap.steps),
  Effect.map(Array.fromRecord),
  Effect.map(Array.map((step) => step[1])),
  Effect.map(Array.findFirst(Schema.is(stepCodec))),
  Effect.flatMap(Either.fromOption(() => new ValidationError({ message: 'No action DOI found' }))),
  Effect.map((step) => step.actions[0].outputs[0].doi),
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
  Effect.flatMap(retrieveActionDoiFromSignpostingDocmapUri),
  Effect.tap((actionDoi) => Console.log(`(3) retrieved action DOI: ${actionDoi}`)),
);

export const retrieveDocmapsFromCoarNotificationUris = (
  configs: ReadonlyArray<{ uuid: string }>,
): Effect.Effect<
ReadonlyArray<string | { uuid: string, error: unknown }>,
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
