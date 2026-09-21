/* eslint-disable id-length */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import apiRequest, {
  API_DEFAULT_TIMEOUT,
  ApiError,
  appendQueryString,
  buildQueryString,
  combineAbortSignals,
  createTimeoutSignal,
  isSilentAbortError,
} from '@/helpers/api-request';

describe('apiRequest', () => {
  const mockFetch = vi.fn();

  global.fetch = mockFetch;

  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('should perform a basic GET request with the default Accept header', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: new Headers(),
      text: () => Promise.resolve('{"foo":"bar"}'),
    });

    const result = await apiRequest({ method: 'GET', url: '/test' });

    expect(mockFetch).toHaveBeenCalledWith(
      '/test',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({ Accept: 'application/json, text/plain, */*' }),
      }),
    );
    expect(result.data).toEqual({ foo: 'bar' });
    expect(result.status).toBe(200);
    expect(result.ok).toBe(true);
  });

  it('should not overwrite a caller-supplied Accept header', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers(),
      text: () => Promise.resolve(''),
    });

    await apiRequest({ method: 'GET', url: '/test' }, { headers: { Accept: 'text/plain' } });

    expect(mockFetch).toHaveBeenCalledWith('/test', expect.objectContaining({ headers: { Accept: 'text/plain' } }));
  });

  it('should merge default headers with per-request headers, caller values winning', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers(),
      text: () => Promise.resolve(''),
    });

    await apiRequest(
      { method: 'GET', url: '/test', defaultHeaders: { locale: 'de', 'X-Common': 'common' } },
      { headers: { locale: 'en' } },
    );

    expect(mockFetch).toHaveBeenCalledWith(
      '/test',
      expect.objectContaining({
        headers: expect.objectContaining({ locale: 'en', 'X-Common': 'common' }),
      }),
    );
  });

  it('should JSON-encode a plain object body and set Content-Type', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers(),
      text: () => Promise.resolve(''),
    });

    await apiRequest({ method: 'POST', url: '/test', data: { foo: 'bar' } });

    expect(mockFetch).toHaveBeenCalledWith(
      '/test',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ foo: 'bar' }),
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
      }),
    );
  });

  it('should not overwrite a caller-supplied Content-Type header', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers(),
      text: () => Promise.resolve(''),
    });

    await apiRequest(
      { method: 'POST', url: '/test', data: { foo: 'bar' } },
      { headers: { 'Content-Type': 'application/vnd.custom+json' } },
    );

    expect(mockFetch).toHaveBeenCalledWith(
      '/test',
      expect.objectContaining({
        headers: expect.objectContaining({ 'Content-Type': 'application/vnd.custom+json' }),
      }),
    );
  });

  it('should pass FormData through untouched without forcing a JSON Content-Type', async () => {
    const formData = new FormData();

    formData.append('file', 'content');

    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers(),
      text: () => Promise.resolve(''),
    });

    await apiRequest({ method: 'POST', url: '/upload', data: formData });

    const [, callOptions] = mockFetch.mock.calls.at(-1) as [string, { body: unknown; headers: Record<string, string> }];

    expect(callOptions.body).toBe(formData);
    expect(callOptions.headers['Content-Type']).toBeUndefined();
  });

  it('should append serialized query params to the URL', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers(),
      text: () => Promise.resolve(''),
    });

    await apiRequest({ method: 'GET', url: '/test' }, { params: { a: 1, b: 'two', c: null, d: undefined } });

    expect(mockFetch).toHaveBeenCalledWith('/test?a=1&b=two', expect.any(Object));
  });

  it('should parse a JSON response body', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers(),
      text: () => Promise.resolve('{"a":1}'),
    });

    const result = await apiRequest({ method: 'GET', url: '/test' });

    expect(result.data).toEqual({ a: 1 });
  });

  it('should fall back to the raw text when the response body is not valid JSON', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers(),
      text: () => Promise.resolve('just text'),
    });

    const result = await apiRequest({ method: 'GET', url: '/test' });

    expect(result.data).toBe('just text');
  });

  it('should return empty string data for an empty response body', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 204,
      headers: new Headers(),
      text: () => Promise.resolve(''),
    });

    const result = await apiRequest({ method: 'GET', url: '/test' });

    expect(result.data).toBe('');
  });

  describe('responseType', () => {
    it('should return the raw Blob when responseType is blob', async () => {
      const blob = new Blob(['binary content']);

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers(),
        blob: () => Promise.resolve(blob),
      });

      const result = await apiRequest({ method: 'GET', url: '/download' }, { responseType: 'blob' });

      expect(result.data).toBe(blob);
    });

    it('should return the raw ArrayBuffer when responseType is arraybuffer', async () => {
      const buffer = new ArrayBuffer(8);

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers(),
        arrayBuffer: () => Promise.resolve(buffer),
      });

      const result = await apiRequest({ method: 'GET', url: '/download' }, { responseType: 'arraybuffer' });

      expect(result.data).toBe(buffer);
    });

    it('should return the raw text without attempting JSON.parse when responseType is text', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers(),
        text: () => Promise.resolve('{"a":1}'),
      });

      const result = await apiRequest({ method: 'GET', url: '/test' }, { responseType: 'text' });

      expect(result.data).toBe('{"a":1}');
    });

    it('should strictly JSON-parse via response.json() when responseType is json', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: () => Promise.resolve({ explicit: true }),
      });

      const result = await apiRequest({ method: 'GET', url: '/test' }, { responseType: 'json' });

      expect(result.data).toEqual({ explicit: true });
    });

    it('should reject when responseType is json and the body is not valid JSON', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: () => Promise.reject(new SyntaxError('Unexpected token')),
      });

      await expect(apiRequest({ method: 'GET', url: '/test' }, { responseType: 'json' })).rejects.toThrow(
        SyntaxError,
      );
    });

    it('should apply responseType to error responses too, so error.response.data matches', async () => {
      const blob = new Blob(['error body']);

      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        headers: new Headers(),
        blob: () => Promise.resolve(blob),
      });

      await expect(
        apiRequest({ method: 'GET', url: '/download' }, { responseType: 'blob' }),
      ).rejects.toMatchObject({
        response: expect.objectContaining({ data: blob }),
      });
    });
  });

  it('should throw an ApiError with the parsed response for a non-ok status', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      headers: new Headers(),
      text: () => Promise.resolve('{"error":"not found"}'),
    });

    await expect(apiRequest({ method: 'GET', url: '/missing' })).rejects.toMatchObject({
      name: 'ApiError',
      status: 404,
      response: expect.objectContaining({ status: 404, data: { error: 'not found' } }),
    });
    await expect(apiRequest({ method: 'GET', url: '/missing' })).rejects.toBeInstanceOf(ApiError);
  });

  it('should pass an explicit AbortSignal through and reject when it fires', async () => {
    const controller = new AbortController();

    mockFetch.mockImplementation(
      (url, requestOptions: { signal?: AbortSignal }) =>
        new Promise((resolve, reject) => {
          requestOptions.signal?.addEventListener('abort', () => {
            reject(new DOMException('Aborted', 'AbortError'));
          });
        }),
    );

    const requestPromise = apiRequest({ method: 'GET', url: '/slow' }, { signal: controller.signal });

    controller.abort();

    await expect(requestPromise).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('should forward credentials/mode/cache/redirect/referrerPolicy to fetch untouched', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers(),
      text: () => Promise.resolve(''),
    });

    await apiRequest(
      { method: 'GET', url: '/test' },
      { credentials: 'include', mode: 'cors', cache: 'no-store', redirect: 'follow', referrerPolicy: 'no-referrer' },
    );

    expect(mockFetch).toHaveBeenCalledWith(
      '/test',
      expect.objectContaining({
        credentials: 'include',
        mode: 'cors',
        cache: 'no-store',
        redirect: 'follow',
        referrerPolicy: 'no-referrer',
      }),
    );
  });

  describe('timeout precedence', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers(),
        text: () => Promise.resolve(''),
      });
    });

    it('falls back to API_DEFAULT_TIMEOUT when neither config.timeout nor options.defaultTimeout is set', async () => {
      const timeoutSpy = vi.spyOn(AbortSignal, 'timeout');

      await apiRequest({ method: 'GET', url: '/test' });

      expect(timeoutSpy).toHaveBeenCalledWith(API_DEFAULT_TIMEOUT);

      timeoutSpy.mockRestore();
    });

    it('uses options.defaultTimeout as the fallback when config.timeout is not set', async () => {
      const timeoutSpy = vi.spyOn(AbortSignal, 'timeout');

      await apiRequest({ method: 'GET', url: '/test', defaultTimeout: 5000 });

      expect(timeoutSpy).toHaveBeenCalledWith(5000);

      timeoutSpy.mockRestore();
    });

    it('lets config.timeout override options.defaultTimeout', async () => {
      const timeoutSpy = vi.spyOn(AbortSignal, 'timeout');

      await apiRequest({ method: 'GET', url: '/test', defaultTimeout: 5000 }, { timeout: 1000 });

      expect(timeoutSpy).toHaveBeenCalledWith(1000);

      timeoutSpy.mockRestore();
    });

    it('disables the timeout when config.timeout is 0, even with a defaultTimeout set', async () => {
      const timeoutSpy = vi.spyOn(AbortSignal, 'timeout');

      await apiRequest({ method: 'GET', url: '/test', defaultTimeout: 5000 }, { timeout: 0 });

      expect(timeoutSpy).not.toHaveBeenCalled();

      timeoutSpy.mockRestore();
    });
  });
});

describe('buildQueryString', () => {
  it('should drop undefined and null entries', () => {
    expect(buildQueryString({ a: 1, b: undefined, c: null })).toBe('a=1');
  });

  it('should keep falsy-but-defined values', () => {
    expect(buildQueryString({ a: false, b: 0, c: '' })).toBe('a=false&b=0&c=');
  });

  it('should serialize array values with a bracket suffix, one entry per element', () => {
    expect(buildQueryString({ tag: ['a', 'b'] })).toBe('tag%5B%5D=a&tag%5B%5D=b');
  });

  it('should percent-encode special characters', () => {
    expect(buildQueryString({ q: 'a b&c' })).toBe('q=a+b%26c');
  });
});

describe('appendQueryString', () => {
  it('should return the url unchanged when the query string is empty', () => {
    expect(appendQueryString('/test', '')).toBe('/test');
  });

  it('should append with a leading ? when the url has no query string yet', () => {
    expect(appendQueryString('/test', 'a=1')).toBe('/test?a=1');
  });

  it('should append with & when the url already has a query string', () => {
    expect(appendQueryString('/test?existing=true', 'a=1')).toBe('/test?existing=true&a=1');
  });
});

describe('combineAbortSignals', () => {
  it('should return undefined when no signal is given', () => {
    expect(combineAbortSignals([undefined, undefined])).toBeUndefined();
  });

  it('should return the single defined signal unchanged', () => {
    const controller = new AbortController();

    expect(combineAbortSignals([undefined, controller.signal])).toBe(controller.signal);
  });

  it('should abort the combined signal when any input signal aborts', () => {
    const first = new AbortController();
    const second = new AbortController();

    const combined = combineAbortSignals([first.signal, second.signal]);

    expect(combined?.aborted).toBe(false);

    second.abort();

    expect(combined?.aborted).toBe(true);
  });

  it('should already be aborted when one of the input signals is aborted upfront', () => {
    const first = new AbortController();

    first.abort();

    const combined = combineAbortSignals([first.signal, new AbortController().signal]);

    expect(combined?.aborted).toBe(true);
  });
});

describe('createTimeoutSignal', () => {
  it('should return undefined when timeout is 0 or negative', () => {
    expect(createTimeoutSignal(0)).toBeUndefined();
    expect(createTimeoutSignal(-1)).toBeUndefined();
  });

  it('should return a signal that aborts with a TimeoutError after the given delay', async () => {
    vi.useFakeTimers();

    const signal = createTimeoutSignal(10);

    expect(signal?.aborted).toBe(false);

    vi.advanceTimersByTime(10);

    expect(signal?.aborted).toBe(true);

    vi.useRealTimers();
  });
});

describe('isSilentAbortError', () => {
  it('should identify AbortError and TimeoutError by name', () => {
    expect(isSilentAbortError(new DOMException('Aborted', 'AbortError'))).toBe(true);
    expect(isSilentAbortError(new DOMException('Timed out', 'TimeoutError'))).toBe(true);
    expect(isSilentAbortError(new Error('Other'))).toBe(false);
    expect(isSilentAbortError(null)).toBe(false);
  });
});

describe('ApiError', () => {
  it('should carry status, code and response on the instance', () => {
    const response = { data: { error: 'boom' }, status: 500, statusText: 'Error', headers: new Headers(), ok: false };
    const error = new ApiError('Request failed', { status: 500, code: 'SERVER', response });

    expect(error.name).toBe('ApiError');
    expect(error.message).toBe('Request failed');
    expect(error.status).toBe(500);
    expect(error.code).toBe('SERVER');
    expect(error.response).toBe(response);
  });
});
