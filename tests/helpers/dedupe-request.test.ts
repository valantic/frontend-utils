import { describe, expect, it, vi } from 'vitest';
import { ApiResult } from '@/helpers/api-request';
import dedupeRequest, { AbortStack } from '@/helpers/dedupe-request';

/**
 * Builds a minimal `ApiResult` for a mocked `send`, so tests can focus on `data`.
 */
function fakeResult<T>(data: T): ApiResult<T> {
  return { data, status: 200, statusText: 'OK', headers: new Headers(), ok: true };
}

describe('dedupeRequest', () => {
  it('calls send() unchanged and leaves the abort stack untouched when no uniqueId is given', async () => {
    const abortStack: AbortStack = {};
    const send = vi.fn().mockResolvedValue(fakeResult('ok'));

    const result = await dedupeRequest({ abortStack, config: { headers: { 'X-Test': '1' } }, send });

    expect(result.data).toBe('ok');
    expect(send).toHaveBeenCalledWith({ headers: { 'X-Test': '1' } });
    expect(abortStack).toEqual({});
  });

  it('registers an AbortController under uniqueId and passes its signal to send()', async () => {
    const abortStack: AbortStack = {};
    const send = vi.fn().mockResolvedValue(fakeResult('ok'));

    await dedupeRequest({ abortStack, uniqueId: 'shared', send });

    const [requestConfig] = send.mock.calls[0] as [{ signal?: AbortSignal }];

    expect(requestConfig.signal).toBeInstanceOf(AbortSignal);
  });

  it('removes the uniqueId entry from the abort stack after a successful response', async () => {
    const abortStack: AbortStack = {};
    const send = vi.fn().mockResolvedValue(fakeResult('ok'));

    await dedupeRequest({ abortStack, uniqueId: 'shared', send });

    expect(abortStack.shared).toBeUndefined();
  });

  it('removes the uniqueId entry from the abort stack after a rejection', async () => {
    const abortStack: AbortStack = {};
    const send = vi.fn().mockRejectedValue(new Error('boom'));

    await expect(dedupeRequest({ abortStack, uniqueId: 'shared', send })).rejects.toThrow('boom');

    expect(abortStack.shared).toBeUndefined();
  });

  it('aborts an in-flight request when a new one is issued with the same uniqueId', async () => {
    const abortStack: AbortStack = {};

    const firstSend = vi.fn(
      (requestConfig?: { signal?: AbortSignal }) =>
        new Promise<ApiResult>((resolve, reject) => {
          requestConfig?.signal?.addEventListener('abort', () => {
            reject(new DOMException('Aborted', 'AbortError'));
          });
        }),
    );
    const secondSend = vi.fn().mockResolvedValue(fakeResult('second'));

    const firstRequest = dedupeRequest({ abortStack, uniqueId: 'dup', send: firstSend });
    const secondRequest = dedupeRequest({ abortStack, uniqueId: 'dup', send: secondSend });

    await expect(firstRequest).rejects.toMatchObject({ name: 'AbortError' });
    await expect(secondRequest).resolves.toMatchObject({ data: 'second' });
    expect(abortStack.dup).toBeUndefined();
  });

  it('does not clear a newer request from the stack when an older, already-superseded one settles', async () => {
    const abortStack: AbortStack = {};
    const firstDeferred = createDeferred<ApiResult>();
    const secondDeferred = createDeferred<ApiResult>();
    const firstSend = vi.fn(() => firstDeferred.promise);
    const secondSend = vi.fn(() => secondDeferred.promise);

    const firstRequest = dedupeRequest({ abortStack, uniqueId: 'dup', send: firstSend });
    const secondRequest = dedupeRequest({ abortStack, uniqueId: 'dup', send: secondSend });

    const secondController = abortStack.dup;

    firstDeferred.resolve(fakeResult('first'));
    await firstRequest;

    // The (superseded) first request settling must not clear the entry the second, still
    // in-flight, request owns.
    expect(abortStack.dup).toBe(secondController);

    secondDeferred.resolve(fakeResult('second'));
    await secondRequest;

    expect(abortStack.dup).toBeUndefined();
  });

  it('preserves and combines a caller-supplied signal instead of discarding it', async () => {
    const abortStack: AbortStack = {};
    const callerController = new AbortController();
    const send = vi.fn().mockResolvedValue(fakeResult('ok'));

    await dedupeRequest({ abortStack, uniqueId: 'shared', config: { signal: callerController.signal }, send });

    const [requestConfig] = send.mock.calls[0] as [{ signal?: AbortSignal }];

    expect(requestConfig.signal?.aborted).toBe(false);

    callerController.abort();

    expect(requestConfig.signal?.aborted).toBe(true);
  });
});

/**
 * Creates a promise together with its own `resolve` function, for tests that need to control
 * exactly when a mocked `send` settles.
 */
function createDeferred<T>(): { promise: Promise<T>; resolve(value: T): void } {
  let resolve: (value: T) => void;

  function captureResolve(res: (value: T) => void): void {
    resolve = res;
  }

  const promise = new Promise<T>(captureResolve);

  return { promise, resolve: (value) => resolve(value) };
}
