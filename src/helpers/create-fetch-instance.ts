/**
 * `fetch`'s own `RequestInit` type, derived rather than referenced by name so the base ESLint
 * `no-undef` rule (which doesn't know DOM lib type-only globals) doesn't flag it.
 */
type FetchRequestInit = NonNullable<Parameters<typeof fetch>[1]>;

/**
 * Configuration for a fetch request.
 */
export type RequestConfig = {
  /**
   * Additional headers to be sent with the request.
   */
  headers?: Record<string, string>;
  /**
   * Query parameters to be appended to the URL. Array values are serialized as repeated keys.
   */
  params?: Record<string, unknown>;
  /**
   * An AbortSignal to cancel the request.
   */
  signal?: AbortSignal;
  /**
   * The expected response type. Defaults to 'json'.
   */
  responseType?: 'json' | 'text' | 'blob' | 'arraybuffer';
  /**
   * The `credentials` mode to use for the request. Defaults to the instance's default (`'same-origin'`).
   */
  credentials?: FetchRequestInit['credentials'];
  /**
   * Milliseconds to wait before aborting the request with a `FetchError` (`code: 'TIMEOUT'`).
   * Disabled (no timeout) when not set.
   */
  timeout?: number;
  /**
   * Number of times to retry the request after a network error or a matching status code.
   * Defaults to 0 (no retries).
   */
  retries?: number;
  /**
   * Milliseconds to wait between retry attempts. Defaults to 0.
   */
  retryDelay?: number;
  /**
   * HTTP status codes that should trigger a retry, in addition to network errors. Defaults to `[502, 503, 504]`.
   */
  retryStatusCodes?: number[];
};

/**
 * Instance-level defaults applied to every request unless overridden per-call.
 */
export type FetchInstanceOptions = {
  /**
   * Prefixed onto every relative request URL. Absolute URLs (with a scheme) are left untouched.
   */
  baseURL?: string;
  /**
   * Default `credentials` mode for every request. Defaults to `'same-origin'`.
   */
  credentials?: FetchRequestInit['credentials'];
  /**
   * Name of the cookie holding the CSRF/XSRF token to forward as a header. Requires `xsrfHeaderName`.
   */
  xsrfCookieName?: string;
  /**
   * Name of the header used to forward the CSRF/XSRF token read from `xsrfCookieName`.
   */
  xsrfHeaderName?: string;
};

/**
 * Standardized response object for all fetch requests.
 *
 * @template T - The type of the response data.
 */
export type FetchResponse<T = unknown> = {
  /**
   * The parsed response data.
   */
  data: T;
  /**
   * HTTP status code.
   */
  status: number;
  /**
   * HTTP status text.
   */
  statusText: string;
  /**
   * Response headers.
   */
  headers: Record<string, string>;
  /**
   * The original request configuration.
   */
  config: RequestConfig;
  /**
   * Set when the response body could not be parsed according to its content type / `responseType`.
   * `data` is `undefined` in that case.
   */
  parseError?: boolean;
};

/**
 * Error thrown when a fetch request fails with a non-2xx status or a network error.
 *
 * @template T - The type of the response data in case of an error.
 */
export class FetchError<T = unknown> extends Error {
  /**
   * The parsed response that triggered the error, if any.
   */
  response?: FetchResponse<T>;
  /**
   * An optional error code (e.g. 'ABORT', 'TIMEOUT', 'NETWORK').
   */
  code?: string;

  /**
   * @param message - Human-readable error description.
   * @param response - The parsed response that triggered the error, if any.
   * @param code - An optional error code (e.g. 'ABORT', 'TIMEOUT', 'NETWORK').
   */
  constructor(message: string, response?: FetchResponse<T>, code?: string) {
    super(message);
    this.name = 'FetchError';
    this.response = response;
    this.code = code;
  }
}

/**
 * Checks if the given error is an AbortError triggered by a caller-provided signal (not a timeout).
 *
 * @param error - The error to check.
 * @returns True if it's an AbortError.
 */
export function isAbortError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === 'AbortError') {
    return true;
  }

  if (error instanceof Error && error.name === 'AbortError') {
    return true;
  }

  return (error as FetchError)?.code === 'ABORT';
}

/**
 * Checks if the given error is a timeout raised by the `timeout` request option.
 *
 * @param error - The error to check.
 * @returns True if it's a timeout error.
 */
export function isTimeoutError(error: unknown): boolean {
  return (error as FetchError)?.code === 'TIMEOUT';
}

/**
 * Checks if the given error is a network-level failure (request never received a response).
 *
 * @param error - The error to check.
 * @returns True if it's a network error.
 */
export function isNetworkError(error: unknown): boolean {
  return (error as FetchError)?.code === 'NETWORK';
}

/**
 * Interface for the fetch instance.
 */
type FetchInstance = {
  /**
   * Global defaults for the instance.
   */
  defaults: {
    headers: { common: Record<string, string> };
    baseURL?: string;
    credentials?: FetchRequestInit['credentials'];
    xsrfCookieName?: string;
    xsrfHeaderName?: string;
  };
  /**
   * Performs a GET request.
   */
  get<T = unknown>(url: string, config?: RequestConfig): Promise<FetchResponse<T>>;
  /**
   * Performs a POST request.
   */
  post<T = unknown>(url: string, data?: unknown, config?: RequestConfig): Promise<FetchResponse<T>>;
  /**
   * Performs a PATCH request.
   */
  patch<T = unknown>(url: string, data?: unknown, config?: RequestConfig): Promise<FetchResponse<T>>;
  /**
   * Performs a PUT request.
   */
  put<T = unknown>(url: string, data?: unknown, config?: RequestConfig): Promise<FetchResponse<T>>;
  /**
   * Performs a DELETE request.
   */
  delete<T = unknown>(url: string, config?: RequestConfig): Promise<FetchResponse<T>>;
};

/**
 * Internal options for the request function.
 */
type InternalRequestOptions = {
  method: string;
  data?: unknown;
  config?: RequestConfig;
};

/**
 * Body types that must be sent through to `fetch` as-is, without JSON serialization
 * or a forced `Content-Type` header.
 */
function isRawBody(data: unknown): boolean {
  return (
    data instanceof FormData || data instanceof Blob || data instanceof ArrayBuffer || data instanceof URLSearchParams
  );
}

/**
 * Reads a cookie value by name from `document.cookie`.
 *
 * @param name - The cookie name.
 * @returns The decoded cookie value, or undefined if not present.
 */
function readCookie(name: string): string | undefined {
  if (typeof document === 'undefined') {
    return undefined;
  }

  const escapedName = name.replaceAll(/[$()*+./?[\\\]^{|}]/g, String.raw`\$&`);
  const match = document.cookie.match(new RegExp(`(?:^|; )${escapedName}=([^;]*)`));

  return match?.[1] === undefined ? undefined : decodeURIComponent(match[1]);
}

/**
 * Waits for the given number of milliseconds.
 */
function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

/**
 * Combines a base URL with a request URL. Absolute URLs (containing a scheme) are returned unchanged.
 *
 * @param baseURL - The base URL to prefix.
 * @param url - The request URL.
 * @returns The combined URL.
 */
function resolveUrl(baseURL: string | undefined, url: string): string {
  if (!baseURL || /^[a-z][a-z\d+.-]*:\/\//i.test(url)) {
    return url;
  }

  return `${baseURL.replace(/\/+$/, '')}/${url.replace(/^\/+/, '')}`;
}

/**
 * Serializes query params, repeating the key for array values, and appends them to the URL.
 *
 * @param url - The request URL.
 * @param queryParameters - The query params to serialize.
 * @returns The URL with the serialized query string appended.
 */
function appendQueryParameters(url: string, queryParameters: Record<string, unknown>): string {
  const searchParameters = new URLSearchParams();

  Object.entries(queryParameters).forEach(([key, value]) => {
    if (value === undefined || value === null) {
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((item) => searchParameters.append(key, String(item)));
    } else {
      searchParameters.append(key, String(value));
    }
  });

  const query = searchParameters.toString();

  if (!query) {
    return url;
  }

  return `${url}${url.includes('?') ? '&' : '?'}${query}`;
}

/**
 * Creates a standalone `fetch`-based HTTP client with axios-like ergonomics (instance defaults,
 * base URL resolution, query param serialization, XSRF header forwarding, timeouts and retries),
 * without depending on Vue or any other framework.
 *
 * @param options - Instance-level defaults (baseURL, credentials, XSRF cookie/header names).
 * @returns A fetch instance with `get`/`post`/`patch`/`put`/`delete` methods.
 *
 * @example @see /tests/helpers/create-fetch-instance.test.ts
 */
export default function createFetchInstance(options: FetchInstanceOptions = {}): FetchInstance {
  const defaults = {
    headers: {
      common: {} as Record<string, string>,
    },
    baseURL: options.baseURL,
    credentials: options.credentials ?? 'same-origin',
    xsrfCookieName: options.xsrfCookieName,
    xsrfHeaderName: options.xsrfHeaderName,
  };

  /**
   * Performs a single fetch attempt (no retries), parsing the response and throwing on non-2xx.
   */
  async function attempt<T>(attemptOptions: InternalRequestOptions & { fullUrl: string }): Promise<FetchResponse<T>> {
    const { fullUrl, method, data, config } = attemptOptions;
    const headers: Record<string, string> = {
      ...defaults.headers.common,
      ...config?.headers,
    };

    const rawBody = isRawBody(data);

    if (data !== undefined && !rawBody && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    if (defaults.xsrfCookieName && defaults.xsrfHeaderName && !headers[defaults.xsrfHeaderName]) {
      const token = readCookie(defaults.xsrfCookieName);

      if (token) {
        headers[defaults.xsrfHeaderName] = token;
      }
    }

    const timeoutController = config?.timeout ? new AbortController() : undefined;
    let timeoutHandle: ReturnType<typeof setTimeout> | undefined;

    if (timeoutController && config?.timeout) {
      timeoutHandle = setTimeout(() => timeoutController.abort(), config.timeout);
    }

    const callerSignal = config?.signal;

    if (callerSignal && timeoutController) {
      callerSignal.addEventListener('abort', () => timeoutController.abort(), { once: true });
    }

    let response: Response;

    try {
      response = await fetch(fullUrl, {
        method,
        headers,
        credentials: config?.credentials ?? defaults.credentials,
        signal: timeoutController ? timeoutController.signal : callerSignal,
        body: data === undefined ? undefined : rawBody ? (data as FetchRequestInit['body']) : JSON.stringify(data),
      });
    } catch (error) {
      if (isAbortError(error)) {
        if (timeoutController && !callerSignal?.aborted) {
          throw new FetchError('Request timed out', undefined, 'TIMEOUT');
        }

        throw new FetchError('Request aborted', undefined, 'ABORT');
      }

      throw new FetchError((error as Error)?.message ?? 'Network error', undefined, 'NETWORK');
    } finally {
      clearTimeout(timeoutHandle);
    }

    const contentType = response.headers.get('content-type') ?? '';
    let responseData: T;
    let parseError = false;

    try {
      switch (config?.responseType) {
        case 'text':
          responseData = (await response.text()) as unknown as T;

          break;

        case 'blob':
          responseData = (await response.blob()) as unknown as T;

          break;

        case 'arraybuffer':
          responseData = (await response.arrayBuffer()) as unknown as T;

          break;

        case 'json':
          responseData = await response.json();

          break;

        default: {
          if (contentType.includes('application/json')) {
            responseData = await response.json();
          } else {
            const text = await response.text();

            try {
              responseData = JSON.parse(text);
            } catch {
              responseData = text as unknown as T;
            }
          }
          break;
        }
      }
    } catch {
      // Handle cases where the response body is empty or invalid for the requested responseType.
      responseData = undefined as unknown as T;
      parseError = true;
    }

    const fetchResponse: FetchResponse<T> = {
      data: responseData,
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      config: config ?? {},
      ...(parseError ? { parseError } : {}),
    };

    if (!response.ok) {
      throw new FetchError<T>(`Request failed with status ${response.status}`, fetchResponse);
    }

    return fetchResponse;
  }

  /**
   * Central request function that handles URL construction, retries, and delegates to `attempt`.
   *
   * @template T - The expected response data type.
   * @param url - The request URL.
   * @param requestOptions - Request options including method, data, and config.
   * @returns A promise resolving to a standardized FetchResponse.
   */
  async function request<T>(url: string, requestOptions: InternalRequestOptions): Promise<FetchResponse<T>> {
    const { method, data, config } = requestOptions;
    let fullUrl = resolveUrl(defaults.baseURL, url);

    if (config?.params) {
      fullUrl = appendQueryParameters(fullUrl, config.params);
    }

    const retries = config?.retries ?? 0;
    const retryDelay = config?.retryDelay ?? 0;
    const retryStatusCodes = config?.retryStatusCodes ?? [502, 503, 504];

    let lastError: unknown;

    for (let attemptNumber = 0; attemptNumber <= retries; attemptNumber += 1) {
      try {
        return await attempt<T>({ fullUrl, method, data, config });
      } catch (error) {
        lastError = error;

        const isRetryableStatus =
          error instanceof FetchError &&
          error.response?.status !== undefined &&
          retryStatusCodes.includes(error.response.status);
        const isRetryableNetwork = isNetworkError(error);

        if (attemptNumber === retries || !(isRetryableStatus || isRetryableNetwork)) {
          throw error;
        }

        if (retryDelay > 0) {
          await wait(retryDelay);
        }
      }
    }

    throw lastError;
  }

  return {
    defaults,
    get: (url, config) => request(url, { method: 'GET', config }),
    post: (url, data, config) => request(url, { method: 'POST', data, config }),
    patch: (url, data, config) => request(url, { method: 'PATCH', data, config }),
    put: (url, data, config) => request(url, { method: 'PUT', data, config }),
    delete: (url, config) => request(url, { method: 'DELETE', config }),
  };
}
