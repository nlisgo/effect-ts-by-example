import { FetchHttpClient } from '@effect/platform';
import {
  Console, Effect, pipe,
} from 'effect';
import {
  retrieveDocmapsFromCoarNotificationUris,
} from './coar-notification';
import { LinkHeaderLive } from './services';

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
    },
  ]),
);

void Effect.runPromise(
  Effect.catchAllCause(
    app
      .pipe(
        Effect.provide(FetchHttpClient.layer),
        Effect.provide(LinkHeaderLive),
      ),
    (cause) => Console.log('Unexpected failure:', cause),
  ),
);
