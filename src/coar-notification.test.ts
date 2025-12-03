import { type URL } from 'url';
import { HttpClient, type HttpClientResponse } from '@effect/platform';
import { describe, it, expect } from '@jest/globals';
import {
  Effect, Layer, pipe,
} from 'effect';
import { retrieveDocmapsFromCoarNotificationUris } from './coar-notification';
import { LinkHeader } from './services';

// Mock data
const mockDocmap = {
  type: 'docmap' as const,
  id: 'https://example.com/docmap-1',
  publisher: {
    name: 'Test Publisher',
    url: 'https://example.com',
  },
  created: '2024-01-01T00:00:00Z',
  updated: '2024-01-02T00:00:00Z',
  'first-step': '_:b0' as const,
  steps: {
    '_:b0': {
      inputs: [{ doi: '10.1234/input' }],
      actions: [{
        outputs: [{
          published: '2024-01-01',
          doi: '10.1234/output',
          type: 'review',
        }],
        inputs: [{
          published: '2024-01-01',
          doi: '10.1234/input',
          type: 'preprint',
        }],
      }],
      assertions: [{
        status: 'reviewed',
        item: '10.1234/input',
      }],
    },
  },
  '@context': 'https://w3id.org/docmaps/context.jsonld',
};

const mockNotification = {
  object: {
    id: 'https://example.com/announcement',
  },
};

const mockLinkHeader = '<https://example.com/docmap>; rel="describedby"; type="application/ld+json"; profile="https://w3id.org/docmaps/context.jsonld"';

// Mock LinkHeader implementation
const mockLinkHeaderService = {
  parse: () => ({
    refs: [
      {
        uri: 'https://example.com/docmap',
        rel: 'describedby',
        type: 'application/ld+json',
        profile: 'https://w3id.org/docmaps/context.jsonld',
      },
    ],
  }),
  isCompatibleEncoding: () => true,
  isSingleOccurenceAttr: () => false,
  isTokenAttr: () => false,
  escapeQuotes: (str: string) => str,
};

const MockLinkHeaderLayer = Layer.succeed(LinkHeader, mockLinkHeaderService as any);

// Mock HttpClient implementation
const makeMockHttpClient = (
  getResponses: Record<string, unknown>,
  headResponses: Record<string, { link: string }>,
): HttpClient.HttpClient => {
  const mockClient: Partial<HttpClient.HttpClient> = {
    get: (url: string | URL) => Effect.succeed({
      json: Effect.succeed(getResponses[String(url)] || {}),
    } as unknown as HttpClientResponse.HttpClientResponse),
    head: (url: string | URL) => Effect.succeed({
      headers: headResponses[String(url)] || {},
    } as unknown as HttpClientResponse.HttpClientResponse),
  };
  return mockClient as HttpClient.HttpClient;
};

describe('retrieveDocmapsFromCoarNotificationUris', () => {
  it('should successfully retrieve docmaps for multiple UUIDs', async () => {
    const result = await pipe(
      retrieveDocmapsFromCoarNotificationUris([
        { uuid: 'test-uuid-1' },
        { uuid: 'test-uuid-2' },
      ]),
      Effect.provide(
        Layer.succeed(
          HttpClient.HttpClient,
          makeMockHttpClient(
            {
              'https://inbox-sciety-prod.elifesciences.org/inbox/urn:uuid:test-uuid-1': mockNotification,
              'https://inbox-sciety-prod.elifesciences.org/inbox/urn:uuid:test-uuid-2': mockNotification,
              'https://example.com/announcement': mockNotification,
              'https://example.com/docmap': [mockDocmap],
            },
            {
              'https://example.com/announcement': { link: mockLinkHeader },
            },
          ),
        ),
      ),
      Effect.provide(MockLinkHeaderLayer),
      Effect.runPromise,
    );

    expect(result).toHaveLength(2);
    expect(result[0]).toBe('10.1234/output');
    expect(result[1]).toBe('10.1234/output');
  });

  it('should handle errors gracefully and return error objects', async () => {
    const result = await pipe(
      retrieveDocmapsFromCoarNotificationUris([
        { uuid: 'error-uuid' },
      ]),
      Effect.provide(
        Layer.succeed(
          HttpClient.HttpClient,
          makeMockHttpClient(
            {
              'https://inbox-sciety-prod.elifesciences.org/inbox/urn:uuid:error-uuid': { object: {} }, // Invalid - missing id
            },
            {},
          ),
        ),
      ),
      Effect.provide(MockLinkHeaderLayer),
      Effect.runPromise,
    );

    expect(result).toHaveLength(1);
    expect(result[0]).toHaveProperty('uuid', 'error-uuid');
    expect(result[0]).toHaveProperty('error');
  });

  it('should return empty array for empty config', async () => {
    const result = await pipe(
      retrieveDocmapsFromCoarNotificationUris([]),
      Effect.provide(
        Layer.succeed(
          HttpClient.HttpClient,
          makeMockHttpClient({}, {}),
        ),
      ),
      Effect.provide(MockLinkHeaderLayer),
      Effect.runPromise,
    );

    expect(result).toHaveLength(0);
  });

  it('should handle missing link headers', async () => {
    const result = await pipe(
      retrieveDocmapsFromCoarNotificationUris([
        { uuid: 'no-link-uuid' },
      ]),
      Effect.provide(
        Layer.succeed(
          HttpClient.HttpClient,
          makeMockHttpClient(
            {
              'https://inbox-sciety-prod.elifesciences.org/inbox/urn:uuid:no-link-uuid': mockNotification,
              'https://example.com/announcement': mockNotification,
            },
            {
              'https://example.com/announcement': { link: '' }, // Empty link
            },
          ),
        ),
      ),
      Effect.provide(MockLinkHeaderLayer),
      Effect.runPromise,
    );

    expect(result).toHaveLength(1);
    expect(result[0]).toHaveProperty('uuid', 'no-link-uuid');
    expect(result[0]).toHaveProperty('error');
  });

  it('should process multiple UUIDs with mixed success and errors', async () => {
    const result = await pipe(
      retrieveDocmapsFromCoarNotificationUris([
        { uuid: 'success-uuid' },
        { uuid: 'error-uuid' },
      ]),
      Effect.provide(
        Layer.succeed(
          HttpClient.HttpClient,
          makeMockHttpClient(
            {
              'https://inbox-sciety-prod.elifesciences.org/inbox/urn:uuid:success-uuid': mockNotification,
              'https://inbox-sciety-prod.elifesciences.org/inbox/urn:uuid:error-uuid': { object: {} },
              'https://example.com/announcement': mockNotification,
              'https://example.com/docmap': [mockDocmap],
            },
            {
              'https://example.com/announcement': { link: mockLinkHeader },
            },
          ),
        ),
      ),
      Effect.provide(MockLinkHeaderLayer),
      Effect.runPromise,
    );

    expect(result).toHaveLength(2);
    expect(result[0]).toBe('10.1234/output');
    expect(result[1]).toHaveProperty('uuid', 'error-uuid');
    expect(result[1]).toHaveProperty('error');
  });
});
