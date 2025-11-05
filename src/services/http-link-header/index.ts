import { Context, Effect, Layer } from 'effect';
import LinkHeaderClass from 'http-link-header';

type LinkHeaderStatic = typeof LinkHeaderClass;

type LinkHeaderService = NonNullable<unknown> & LinkHeaderStatic;

const LinkHeaderTag = Context.GenericTag<LinkHeaderService>('LinkHeaderService');

export const LinkHeaderLive: Layer.Layer<LinkHeaderService> = Layer.succeed(
  LinkHeaderTag,
  LinkHeaderClass as LinkHeaderService,
);

/**
 * Helper to wrap a service method in an Effect
 */
const wrapServiceMethod = <Args extends Array<unknown>, R>(
  methodName: keyof LinkHeaderService,
) => (...args: Args): Effect.Effect<R, never, LinkHeaderService> => Effect.flatMap(
    LinkHeaderTag,
    (service) => {
      const method = service[methodName];
      if (typeof method === 'function') {
        return Effect.succeed((method as unknown as (...args: Args) => R).apply(service, args));
      }
      throw new Error(`${String(methodName)} is not a function`);
    },
  );

/**
 * Dynamically create Effect-wrapped versions of all static methods
 */
export const LinkHeader = {
  parse: wrapServiceMethod<[value: string], ReturnType<typeof LinkHeaderClass.parse>>('parse'),
  isCompatibleEncoding: wrapServiceMethod<[value: string], ReturnType<typeof LinkHeaderClass.isCompatibleEncoding>>('isCompatibleEncoding'),
  // Add more methods as needed - TypeScript will ensure type safety
};
