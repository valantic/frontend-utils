import { ApiPromise, ApiRequestConfig, combineAbortSignals } from './api-request';

/**
 * A mutable registry of in-flight `AbortController`s, keyed by an arbitrary caller-chosen id.
 * Owned by the caller — typically one instance per consumer (e.g. one per API plugin), shared
 * across every request method it exposes.
 */
export type AbortStack = Record<string, AbortController>;

/**
 * Options for `dedupeRequest`.
 *
 * @template T - The type of the resolved response data.
 */
export type DedupeRequestOptions<T = unknown> = {
  /** The de-duplication registry to read from and update. */
  abortStack: AbortStack;
  /**
   * Requests sharing the same id abort each other. When omitted, `send` runs with no
   * de-duplication and `abortStack` is left untouched.
   */
  uniqueId?: string;
  /** The per-request config `send` will be called with, merged with the de-duplication signal. */
  config?: ApiRequestConfig;
  /** Performs the request itself, e.g. `(requestConfig) => apiRequest(options, requestConfig)`. */
  send(requestConfig?: ApiRequestConfig): ApiPromise<T>;
};

/**
 * Runs `send` — typically a call to `apiRequest` — with request de-duplication keyed by
 * `uniqueId`: any previous in-flight request registered under the same key in `abortStack` is
 * aborted, this one is registered in its place, and the entry is cleared once this request
 * settles (unless a newer request already replaced it). A caller-supplied `config.signal` is
 * preserved and combined with the de-duplication signal rather than being silently overwritten.
 *
 * Because it wraps `send` rather than a specific HTTP method, the same de-duplication behavior
 * applies uniformly to `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, or any other verb — call it around
 * every method a consumer exposes, not just reads, to get consistent cancellation everywhere.
 *
 * @param options - See `DedupeRequestOptions`.
 * @returns The result (or rejection) of `send`, unchanged.
 *
 * @example @see /tests/helpers/dedupe-request.test.ts
 */
export default async function dedupeRequest<T = unknown>(options: DedupeRequestOptions<T>): ApiPromise<T> {
  const { abortStack, uniqueId, config, send } = options;

  if (!uniqueId) {
    return send(config);
  }

  abortStack[uniqueId]?.abort();

  const controller = new AbortController();

  abortStack[uniqueId] = controller;

  const signal = config?.signal ? combineAbortSignals([config.signal, controller.signal]) : controller.signal;

  const releaseIfCurrent = (): void => {
    if (abortStack[uniqueId] === controller) {
      delete abortStack[uniqueId];
    }
  };

  try {
    const result = await send({ ...config, signal });

    releaseIfCurrent();

    return result;
  } catch (error) {
    releaseIfCurrent();

    throw error;
  }
}
