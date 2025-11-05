import { Context, Effect, Layer } from 'effect';
import LinkHeaderClass from 'http-link-header';

type LinkHeaderStatic = typeof LinkHeaderClass;

type LinkHeaderService = NonNullable<unknown> & LinkHeaderStatic;

const LinkHeaderTag = Context.GenericTag<LinkHeaderService>('LinkHeaderService');

export const LinkHeaderLive: Layer.Layer<LinkHeaderService> = Layer.succeed(
  LinkHeaderTag,
  LinkHeaderClass as LinkHeaderService,
);

export const LinkHeader = {
  parse: (
    value: string,
  ): Effect.Effect<ReturnType<typeof LinkHeaderClass.parse>, never, LinkHeaderService> => Effect.andThen(
    LinkHeaderTag,
    (service) => service.parse(value),
  ),
  isCompatibleEncoding: (
    value: string,
  ): Effect.Effect<ReturnType<typeof LinkHeaderClass.isCompatibleEncoding>, never, LinkHeaderService> => Effect.andThen(
    LinkHeaderTag,
    (service) => service.isCompatibleEncoding(value),
  ),
};
