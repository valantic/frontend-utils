/**
 * Neutral per-request options. Deliberately has no `data`/`body` field — request bodies are
 * passed as an explicit argument to the transport helper, so there is exactly one way to send one.
 */
export type ApiRequestConfig = {
  /** Extra headers merged on top of the request's default headers, caller values winning. */
  headers?: Record<string, string>;
  /** Serialized into the outgoing URL's query string, never sent as a request body. */
  params?: Record<string, unknown>;
  /** Caller-supplied abort signal, combined with the timeout signal into a single signal. */
  signal?: AbortSignal;
  /** Milliseconds before the request is aborted; `0` disables the timeout. */
  timeout?: number;
  /** Passed through to `fetch` untouched. */
  // eslint-disable-next-line no-undef -- `RequestCredentials` is a type-only DOM lib global, not a runtime value, so it is unknown to eslint's `no-undef`.
  credentials?: RequestCredentials;
  /** Passed through to `fetch` untouched. */
  // eslint-disable-next-line no-undef -- `RequestMode` is a type-only DOM lib global, not a runtime value, so it is unknown to eslint's `no-undef`.
  mode?: RequestMode;
  /** Passed through to `fetch` untouched. */
  // eslint-disable-next-line no-undef -- `RequestCache` is a type-only DOM lib global, not a runtime value, so it is unknown to eslint's `no-undef`.
  cache?: RequestCache;
  /** Passed through to `fetch` untouched. */
  // eslint-disable-next-line no-undef -- `RequestRedirect` is a type-only DOM lib global, not a runtime value, so it is unknown to eslint's `no-undef`.
  redirect?: RequestRedirect;
  /** Passed through to `fetch` untouched. */
  // eslint-disable-next-line no-undef -- `ReferrerPolicy` is a type-only DOM lib global, not a runtime value, so it is unknown to eslint's `no-undef`.
  referrerPolicy?: ReferrerPolicy;
};

/**
 * The HTTP-level response wrapper returned by `apiRequest`.
 */
export type ApiResult<Data = unknown> = {
  /** Parsed response body. Typed `unknown` rather than `any` — consumers must narrow it themselves. */
  data: Data;
  /** HTTP status code. */
  status: number;
  /** HTTP status text. */
  statusText: string;
  /** Raw response headers. */
  headers: Headers;
  /** `true` when the status is in the 2xx range. */
  ok: boolean;
};

/**
 * The return type of `apiRequest`.
 */
export type ApiPromise<Data = unknown> = Promise<ApiResult<Data>>;

/**
 * Structural contract of a rejection thrown by `apiRequest`.
 */
export type ApiErrorShape = {
  /** Error name, e.g. `ApiError`. */
  name: string;
  /** Human-readable error message. */
  message: string;
  /** HTTP status code, when the rejection was caused by a non-2xx response. */
  status?: number;
  /** Machine-readable error code, when available. */
  code?: string;
  /** Parsed error response, when the rejection was caused by a non-2xx response. */
  response?: ApiResult;
};

/**
 * Options describing the request itself, independent of the neutral per-request `ApiRequestConfig`.
 */
export type ApiRequestOptions = {
  method: string;
  url: string;
  data?: unknown;
  defaultHeaders?: Record<string, string>;
};

/**
 * Default `Accept` header value used when the caller doesn't supply one.
 */
const DEFAULT_ACCEPT_HEADER = 'application/json, text/plain, */*';

/**
 * Default request timeout in milliseconds, applied unless a per-request `config.timeout` overrides
 * it; `0` disables the timeout.
 */
export const API_DEFAULT_TIMEOUT = 30_000;

/**
 * Real `Error` subclass rejected by `apiRequest` on a non-2xx response or a network failure,
 * carrying the parsed response body so callers can read `error.response.data`.
 */
export class ApiError extends Error implements ApiErrorShape {
  status?: number;

  code?: string;

  response?: ApiResult;

  /**
   * Creates an `ApiError` carrying the HTTP status and parsed response body, when available.
   */
  constructor(message: string, init?: { status?: number; code?: string; response?: ApiResult }) {
    super(message);

    this.name = 'ApiError';
    this.status = init?.status;
    this.code = init?.code;
    this.response = init?.response;
  }
}

/**
 * Returns `true` when `headers` already contains a header named `name`, compared case-insensitively.
 */
function hasHeader(headers: Record<string, string>, name: string): boolean {
  return Object.keys(headers).some((key) => key.toLowerCase() === name.toLowerCase());
}

/**
 * Returns `true` for values `fetch` accepts as a request body untouched, without JSON-encoding.
 */
function isRawBody(data: unknown): data is FormData | URLSearchParams | Blob | ArrayBuffer | ReadableStream | string {
  return (
    data instanceof FormData ||
    data instanceof URLSearchParams ||
    data instanceof Blob ||
    data instanceof ArrayBuffer ||
    data instanceof ReadableStream ||
    typeof data === 'string'
  );
}

/**
 * Serializes a params object into a query string (no leading `?`): `undefined`/`null` entries are
 * dropped (checked explicitly, never by truthiness, so `false`/`0`/`''` survive), array values are
 * appended once per element under `` `${key}[]` ``, and everything is percent-encoded via
 * `URLSearchParams` rather than raw string concatenation.
 *
 * @param parameters - The query params to serialize.
 * @returns The serialized query string.
 *
 * @example @see /tests/helpers/api-request.test.ts
 */
export function buildQueryString(parameters: Record<string, unknown>): string {
  const searchParameters = new URLSearchParams();

  Object.entries(parameters).forEach(([key, value]) => {
    if (value === undefined || value === null) {
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((element) => {
        if (element === undefined || element === null) {
          return;
        }

        searchParameters.append(`${key}[]`, String(element));
      });

      return;
    }

    searchParameters.append(key, String(value));
  });

  return searchParameters.toString();
}

/**
 * Appends a query string to a url, returning `url` unchanged when `queryString` is empty and
 * otherwise joining with `?` or `&` depending on whether `url` already contains a query string.
 *
 * @param url - The request URL.
 * @param queryString - The query string to append (no leading `?`).
 * @returns The URL with the query string appended.
 *
 * @example @see /tests/helpers/api-request.test.ts
 */
export function appendQueryString(url: string, queryString: string): string {
  if (!queryString) {
    return url;
  }

  return `${url}${url.includes('?') ? '&' : '?'}${queryString}`;
}

/**
 * Combines multiple abort signals into one. Uses the native `AbortSignal.any()` when the runtime
 * provides it, falling back to a manual multi-listener controller otherwise.
 *
 * @param signals - The signals to combine; `undefined` entries are ignored.
 * @returns A single combined signal, or `undefined` when no signal was provided.
 *
 * @example @see /tests/helpers/api-request.test.ts
 */
export function combineAbortSignals(signals: Array<AbortSignal | undefined>): AbortSignal | undefined {
  const definedSignals = signals.filter((signal): signal is AbortSignal => signal !== undefined);

  if (definedSignals.length === 0) {
    return undefined;
  }

  if (definedSignals.length === 1) {
    return definedSignals[0];
  }

  if (typeof AbortSignal.any === 'function') {
    return AbortSignal.any(definedSignals);
  }

  // Manual fallback for runtimes without `AbortSignal.any()`. Listeners are intentionally never
  // removed: every signal combined here is per-request and short-lived, so nothing is leaked
  // beyond the lifetime of a single request.
  const controller = new AbortController();

  definedSignals.some((signal) => {
    if (signal.aborted) {
      controller.abort(signal.reason);

      return true;
    }

    signal.addEventListener(
      'abort',
      () => {
        controller.abort(signal.reason);
      },
      { once: true },
    );

    return false;
  });

  return controller.signal;
}

/**
 * Returns a signal that aborts after `timeout` milliseconds, or `undefined` when `timeout` is `0`
 * or negative (no timeout). Prefers the native `AbortSignal.timeout()`; falls back to a manually
 * scheduled controller otherwise. Both paths abort with a `TimeoutError`-named reason so
 * `isSilentAbortError` recognises a timeout the same way regardless of which path ran.
 *
 * @param timeout - Milliseconds before the signal aborts.
 * @returns The timeout signal, or `undefined` when disabled.
 *
 * @example @see /tests/helpers/api-request.test.ts
 */
export function createTimeoutSignal(timeout: number): AbortSignal | undefined {
  if (timeout <= 0) {
    return undefined;
  }

  if (typeof AbortSignal.timeout === 'function') {
    return AbortSignal.timeout(timeout);
  }

  const controller = new AbortController();

  setTimeout(() => {
    controller.abort(new DOMException('The operation timed out.', 'TimeoutError'));
  }, timeout);

  return controller.signal;
}

/**
 * Returns `true` when a rejection is a caller-triggered abort or a timeout, both of which callers
 * typically want to treat silently (no error notification). Reads the `name` off the rejection
 * value rather than using `instanceof DOMException`, which is inconsistent enough across runtimes
 * (browser vs jsdom) that a name check is the robust form.
 *
 * @param error - The error to check.
 * @returns True if it's an abort or timeout error.
 *
 * @example @see /tests/helpers/api-request.test.ts
 */
export function isSilentAbortError(error: unknown): boolean {
  const name = (error as { name?: string } | null)?.name;

  return name === 'AbortError' || name === 'TimeoutError';
}

/**
 * Issues an HTTP request via native `fetch`: JSON body parsing into `data`, rejection on a non-2xx
 * response carrying the parsed body at `.response.data`, `params` → query-string serialization,
 * and a combined abort/timeout signal — all without depending on Vue, Pinia, or any other
 * framework.
 *
 * @param options - The request itself: method, url, optional body data, and default headers.
 * @param config - Optional per-request configuration (headers, params, signal, timeout, ...).
 * @returns A promise resolving to a standardized `ApiResult`.
 *
 * @example @see /tests/helpers/api-request.test.ts
 */
export default async function apiRequest(options: ApiRequestOptions, config?: ApiRequestConfig): ApiPromise {
  const finalUrl = appendQueryString(options.url, buildQueryString(config?.params ?? {}));

  const headers: Record<string, string> = {
    ...options.defaultHeaders,
    ...config?.headers,
  };

  if (!hasHeader(headers, 'accept')) {
    headers.Accept = DEFAULT_ACCEPT_HEADER;
  }

  // eslint-disable-next-line no-undef -- `BodyInit` is a type-only DOM lib global, not a runtime value, so it is unknown to eslint's `no-undef`.
  let body: BodyInit | undefined;

  if (options.data !== undefined) {
    if (isRawBody(options.data)) {
      body = options.data;
    } else {
      body = JSON.stringify(options.data);

      if (!hasHeader(headers, 'content-type')) {
        headers['Content-Type'] = 'application/json';
      }
    }
  }

  const signal = combineAbortSignals([config?.signal, createTimeoutSignal(config?.timeout ?? API_DEFAULT_TIMEOUT)]);

  // `credentials` is left at the platform default (sends cookies for same-origin requests) unless
  // the caller opts into a different value.
  const response = await fetch(finalUrl, {
    method: options.method,
    headers,
    body,
    signal,
    credentials: config?.credentials,
    mode: config?.mode,
    cache: config?.cache,
    redirect: config?.redirect,
    referrerPolicy: config?.referrerPolicy,
  });

  const text = await response.text();
  let data: unknown = text;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  const result: ApiResult = {
    data,
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
    ok: response.ok,
  };

  if (!response.ok) {
    throw new ApiError(`Request failed with status ${response.status}`, {
      status: response.status,
      response: result,
    });
  }

  return result;
}
