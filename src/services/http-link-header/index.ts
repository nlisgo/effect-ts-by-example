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
 * Helper to wrap a static method from the service in an Effect
 * Uses explicit typing for better type inference in pipe chains
 */
const wrap = <Args extends ReadonlyArray<unknown>, R>(
  methodName: keyof LinkHeaderStatic,
): ((...args: Args) => Effect.Effect<R, never, LinkHeaderService>) => (...args: Args) => Effect.map(
    LinkHeaderTag,
    (service) => {
      const method = service[methodName];
      if (typeof method === 'function') {
        return (method as unknown as (...args: Args) => R)(...args);
      }
      throw new Error(`${String(methodName)} is not a function`);
    },
  );

/**
 * Effect-wrapped versions of all LinkHeader static methods
 * Explicitly typed for better type inference in pipe chains
 */
export const LinkHeader = {
  parse: wrap<Parameters<typeof LinkHeaderClass.parse>, ReturnType<typeof LinkHeaderClass.parse>>('parse'),
  isCompatibleEncoding: wrap<Parameters<typeof LinkHeaderClass.isCompatibleEncoding>, ReturnType<typeof LinkHeaderClass.isCompatibleEncoding>>('isCompatibleEncoding'),
  escapeQuotes: wrap<Parameters<typeof LinkHeaderClass.escapeQuotes>, ReturnType<typeof LinkHeaderClass.escapeQuotes>>('escapeQuotes'),
};
