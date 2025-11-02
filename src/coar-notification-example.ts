import { FetchHttpClient, HttpClient } from '@effect/platform';
import { Console, Effect, pipe } from 'effect';
import * as A from 'effect/Array';
import * as E from 'effect/Either';
import * as O from 'effect/Option';
import * as S from 'effect/Schema';
import parseLinkHeader from 'parse-link-header';

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
  Effect.map(
    (link) => link
      .replace(/>\s*;\s*/g, '>; ')
      .replace(/(?<!;)\s+(?=(type|profile|title|rev)=)/g, '; ')
      .replace(/;\s*;/g, '; ')
      .trim()
      .split(', '),
  ),
  Effect.map(A.map(parseLinkHeader)),
  Effect.map(A.filterMap(O.fromNullable)),
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
  Effect.tap((signpostingDocmapUri) => Console.log(`Step 2: retrieved DocMap uri: ${signpostingDocmapUri}`)),
);

const retrieveDocmapFromSignpostingDocmapUri = (signpostingDocmapUri: string) => pipe(
  signpostingDocmapUri,
  httpGetAndValidate(docmapsCodec),
  Effect.map(A.head),
  Effect.flatMap(
    (opt) => (O.isSome(opt)
      ? Effect.succeed(opt.value)
      : Effect.fail(new Error('DocMaps array is empty'))),
  ),
);

const retrieveDocmapFromCoarNotificationUri = (coarNotificationUri: string) => pipe(
  coarNotificationUri,
  retrieveAnnouncementActionUriFromCoarNotificationUri,
  Effect.flatMap(retrieveSignpostingDocmapUriFromAnnouncementActionUri),
  Effect.flatMap(retrieveDocmapFromSignpostingDocmapUri),
);

const retrieveDocmapsFromCoarNotificationUris = (configs: ReadonlyArray<{ uuid: string }>) => pipe(
  configs,
  Effect.forEach(({ uuid }) => pipe(
    retrieveDocmapFromCoarNotificationUri(`https://inbox-sciety-prod.elifesciences.org/inbox/urn:uuid:${uuid}`),
    Effect.either,
    Effect.map((result) => ({ uuid, result })),
  )),
);

const program = pipe(
  retrieveDocmapsFromCoarNotificationUris([
    {
      uuid: 'bf3513ee-1fef-4f30-a61b-20721b505f11',
    },
    {
      uuid: '9154949f-6da4-4f16-8997-a0762f19b05a',
    },
    {
      uuid: '7140557f-6fe6-458f-ad59-21a9d53c8eb2',
    },
  ]),
  Effect.provide(FetchHttpClient.layer),
  Effect.flatMap((results) => Effect.forEach(
    results,
    ({ uuid, result }) => pipe(
      result,
      E.match({
        onLeft: (error) => Console.error(`Error retrieving docmap for ${uuid}:`, error),
        onRight: (docmap) => Console.log(`DocMap for ${uuid}:`, docmap),
      }),
    ),
    { discard: true },
  )),
);

void Effect.runPromise(
  Effect.catchAllCause(program, (cause) => Console.log('Unexpected failure:', cause)),
);
