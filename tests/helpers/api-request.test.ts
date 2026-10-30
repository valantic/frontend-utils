/* eslint-disable id-length */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import apiRequest, {
  API_DEFAULT_TIMEOUT,
  ApiError,
  appendFormEntries,
  appendQueryString,
  buildQueryString,
  combineAbortSignals,
  createTimeoutSignal,
  isSilentAbortError,
  resolveErrorResponseType,
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
      { method: 'GET', url: '/test', defaultHeaders: { 'locale': 'de', 'X-Common': 'common' } },
      { headers: { locale: 'en' } },
    );

    expect(mockFetch).toHaveBeenCalledWith(
      '/test',
      expect.objectContaining({
        headers: expect.objectContaining({ 'locale': 'en', 'X-Common': 'common' }),
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

  describe('form content types', () => {
    const okResponse = { ok: true, status: 200, headers: new Headers(), text: () => Promise.resolve('') };

    it('should serialize a plain object as bracket-notation url-encoded body', async () => {
      mockFetch.mockResolvedValue(okResponse);

      await apiRequest(
        { method: 'POST', url: '/login', data: { loginForm: { email: 'a@b.test', password: 'p&ss' } } },
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
      );

      const [, callOptions] = mockFetch.mock.calls.at(-1) as [string, { body: URLSearchParams; headers: object }];

      expect(callOptions.body).toBeInstanceOf(URLSearchParams);
      expect(callOptions.body.get('loginForm[email]')).toBe('a@b.test');
      expect(callOptions.body.get('loginForm[password]')).toBe('p&ss');
      expect(callOptions.headers).toEqual(
        expect.objectContaining({ 'Content-Type': 'application/x-www-form-urlencoded' }),
      );
    });

    it('should pass a string body through for a url-encoded content type', async () => {
      mockFetch.mockResolvedValue(okResponse);

      await apiRequest(
        { method: 'POST', url: '/login', data: 'a=1' },
        { headers: { 'content-type': 'application/x-www-form-urlencoded' } },
      );

      expect(mockFetch).toHaveBeenCalledWith('/login', expect.objectContaining({ body: 'a=1' }));
    });

    it('should drop a caller-supplied multipart Content-Type so fetch can add the boundary', async () => {
      mockFetch.mockResolvedValue(okResponse);

      const formData = new FormData();

      formData.append('name', 'value');

      await apiRequest(
        { method: 'POST', url: '/upload', data: formData },
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );

      const [, callOptions] = mockFetch.mock.calls.at(-1) as [
        string,
        { body: unknown; headers: Record<string, string> },
      ];

      expect(callOptions.body).toBe(formData);
      expect(Object.keys(callOptions.headers).map((key) => key.toLowerCase())).not.toContain('content-type');
    });

    it('should convert a plain object to FormData for a multipart content type', async () => {
      mockFetch.mockResolvedValue(okResponse);

      await apiRequest(
        { method: 'POST', url: '/upload', data: { tags: ['a', 'b'], skipped: undefined } },
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );

      const [, callOptions] = mockFetch.mock.calls.at(-1) as [string, { body: FormData; headers: object }];

      expect(callOptions.body).toBeInstanceOf(FormData);
      expect(callOptions.body.getAll('tags[]')).toEqual(['a', 'b']);
      expect(callOptions.body.has('skipped')).toBe(false);
      expect(callOptions.headers).not.toHaveProperty('Content-Type');
    });
  });

  describe('form content type edge cases', () => {
    const okResponse = { ok: true, status: 200, headers: new Headers(), text: () => Promise.resolve('') };

    it('should match a content type with parameters and different casing', async () => {
      mockFetch.mockResolvedValue(okResponse);

      await apiRequest(
        { method: 'POST', url: '/upload', data: { a: '1' } },
        { headers: { 'content-type': 'Multipart/Form-Data; charset=utf-8' } },
      );

      const [, callOptions] = mockFetch.mock.calls.at(-1) as [string, { body: FormData; headers: object }];

      expect(callOptions.body).toBeInstanceOf(FormData);
      expect(Object.keys(callOptions.headers).map((key) => key.toLowerCase())).not.toContain('content-type');
    });

    it('should apply the form handling for a content type from defaultHeaders', async () => {
      mockFetch.mockResolvedValue(okResponse);

      await apiRequest({
        method: 'POST',
        url: '/login',
        data: { a: '1' },
        defaultHeaders: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });

      const [, callOptions] = mockFetch.mock.calls.at(-1) as [string, { body: URLSearchParams }];

      expect(callOptions.body.get('a')).toBe('1');
    });

    it('should drop the multipart content type and pass a string body through', async () => {
      mockFetch.mockResolvedValue(okResponse);

      await apiRequest(
        { method: 'POST', url: '/upload', data: 'raw' },
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );

      const [, callOptions] = mockFetch.mock.calls.at(-1) as [string, { body: string; headers: object }];

      expect(callOptions.body).toBe('raw');
      expect(callOptions.headers).not.toHaveProperty('Content-Type');
    });

    it('should not throw on a non-string header value', async () => {
      mockFetch.mockResolvedValue(okResponse);

      await expect(
        apiRequest(
          { method: 'POST', url: '/x', data: { a: 1 } },
          { headers: { 'Content-Type': undefined as unknown as string } },
        ),
      ).resolves.toBeDefined();
    });
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

      await expect(apiRequest({ method: 'GET', url: '/test' }, { responseType: 'json' })).rejects.toThrow(SyntaxError);
    });

    it('should apply a binary responseType to a genuinely binary error response', async () => {
      const blob = new Blob(['error body']);

      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        headers: new Headers({ 'Content-Type': 'application/octet-stream' }),
        blob: () => Promise.resolve(blob),
      });

      await expect(apiRequest({ method: 'GET', url: '/download' }, { responseType: 'blob' })).rejects.toMatchObject({
        response: expect.objectContaining({ data: blob }),
      });
    });

    it('should ignore a binary responseType for an error response whose Content-Type is JSON', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        headers: new Headers({ 'Content-Type': 'application/json' }),
        text: () => Promise.resolve('{"error":"invalid"}'),
      });

      await expect(apiRequest({ method: 'GET', url: '/download' }, { responseType: 'blob' })).rejects.toMatchObject({
        name: 'ApiError',
        response: expect.objectContaining({ data: { error: 'invalid' } }),
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

  it('should reject with an ApiError carrying code ERR_NETWORK on a raw fetch rejection', async () => {
    mockFetch.mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(apiRequest({ method: 'GET', url: '/test' })).rejects.toMatchObject({
      name: 'ApiError',
      code: 'ERR_NETWORK',
      status: undefined,
      response: undefined,
    });
  });

  it('should not wrap an abort/timeout rejection as ERR_NETWORK', async () => {
    mockFetch.mockRejectedValue(new DOMException('Aborted', 'AbortError'));

    await expect(apiRequest({ method: 'GET', url: '/test' })).rejects.toMatchObject({ name: 'AbortError' });
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

describe('resolveErrorResponseType', () => {
  it('should leave the responseType unchanged for a success response', () => {
    const response = new Response(null, { status: 200, headers: { 'Content-Type': 'application/json' } });

    expect(resolveErrorResponseType(response, 'blob')).toBe('blob');
  });

  it('should leave a non-binary responseType unchanged for an error response', () => {
    const response = new Response(null, { status: 500, headers: { 'Content-Type': 'application/json' } });

    expect(resolveErrorResponseType(response, 'text')).toBe('text');
    expect(resolveErrorResponseType(response, undefined)).toBeUndefined();
  });

  it('should override a binary responseType with the default parser for a JSON/text error body', () => {
    const jsonResponse = new Response(null, { status: 500, headers: { 'Content-Type': 'application/json' } });
    const textResponse = new Response(null, { status: 500, headers: { 'Content-Type': 'text/plain' } });

    expect(resolveErrorResponseType(jsonResponse, 'blob')).toBeUndefined();
    expect(resolveErrorResponseType(textResponse, 'arraybuffer')).toBeUndefined();
  });

  it('should keep a binary responseType for a genuinely binary or content-type-less error body', () => {
    const binaryResponse = new Response(null, { status: 500, headers: { 'Content-Type': 'application/octet-stream' } });
    const noContentTypeResponse = new Response(null, { status: 500 });

    expect(resolveErrorResponseType(binaryResponse, 'blob')).toBe('blob');
    expect(resolveErrorResponseType(noContentTypeResponse, 'blob')).toBe('blob');
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

describe('appendFormEntries', () => {
  it('should flatten nested objects and arrays into bracket notation and drop empty values', () => {
    const searchParameters = new URLSearchParams();

    appendFormEntries(searchParameters, { a: { b: 1, c: [2, 3] }, d: null, e: undefined, f: false }, '');

    expect([...searchParameters.entries()]).toEqual([
      ['a[b]', '1'],
      ['a[c][]', '2'],
      ['a[c][]', '3'],
      ['f', 'false'],
    ]);
  });

  it('should serialize a Date as ISO string', () => {
    const searchParameters = new URLSearchParams();

    appendFormEntries(searchParameters, { at: new Date('2026-01-02T03:04:05.000Z') }, '');

    expect(searchParameters.get('at')).toBe('2026-01-02T03:04:05.000Z');
  });

  it('should flatten arrays of objects', () => {
    const searchParameters = new URLSearchParams();

    appendFormEntries(searchParameters, { items: [{ id: 1 }, { id: 2 }] }, '');

    expect([...searchParameters.entries()]).toEqual([
      ['items[][id]', '1'],
      ['items[][id]', '2'],
    ]);
  });

  it('should flatten a null-prototype object', () => {
    const searchParameters = new URLSearchParams();

    appendFormEntries(searchParameters, Object.assign(Object.create(null), { a: 1 }), '');

    expect(searchParameters.get('a')).toBe('1');
  });

  it('should keep a Blob as-is when appending to FormData', () => {
    const formData = new FormData();
    const file = new File(['content'], 'import.csv');

    appendFormEntries(formData, { file }, '');

    expect((formData.get('file') as File).name).toBe('import.csv');
  });
});
