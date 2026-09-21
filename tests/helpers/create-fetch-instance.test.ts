/* eslint-disable id-length */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import createFetchInstance, { FetchError, isAbortError, isNetworkError, isTimeoutError } from '@/helpers/create-fetch-instance';

describe('createFetchInstance', () => {
  const mockFetch = vi.fn();

  global.fetch = mockFetch;

  beforeEach(() => {
    mockFetch.mockReset();
  });

  describe('createFetchInstance', () => {
    it('should create a fetch instance with default methods', () => {
      const instance = createFetchInstance();

      expect(instance).toHaveProperty('get');
      expect(instance).toHaveProperty('post');
      expect(instance).toHaveProperty('patch');
      expect(instance).toHaveProperty('put');
      expect(instance).toHaveProperty('delete');
      expect(instance).toHaveProperty('defaults');
    });

    it('should perform a basic GET request', async () => {
      const instance = createFetchInstance();
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({ foo: 'bar' }),
      };

      mockFetch.mockResolvedValue(mockResponse);

      const response = await instance.get('/test');

      expect(mockFetch).toHaveBeenCalledWith(
        '/test',
        expect.objectContaining({
          method: 'GET',
        }),
      );
      expect(response.data).toEqual({ foo: 'bar' });
      expect(response.status).toBe(200);
    });

    it('should handle URL parameters correctly', async () => {
      const instance = createFetchInstance();

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: () => Promise.resolve({}),
      });

      await instance.get('/test', { params: { a: 1, b: 'two', c: null, d: undefined } });

      expect(mockFetch).toHaveBeenCalledWith('/test?a=1&b=two', expect.any(Object));

      await instance.get('/test?existing=true', { params: { a: 1 } });

      expect(mockFetch).toHaveBeenCalledWith('/test?existing=true&a=1', expect.any(Object));
    });

    it('should merge headers correctly', async () => {
      const instance = createFetchInstance();

      instance.defaults.headers.common['X-Common'] = 'common';

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: () => Promise.resolve({}),
      });

      await instance.get('/test', { headers: { 'X-Custom': 'custom' } });

      expect(mockFetch).toHaveBeenCalledWith(
        '/test',
        expect.objectContaining({
          headers: {
            'X-Common': 'common',
            'X-Custom': 'custom',
          },
        }),
      );
    });

    it('should set Content-Type to application/json if data is provided', async () => {
      const instance = createFetchInstance();

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: () => Promise.resolve({}),
      });

      await instance.post('/test', { foo: 'bar' });

      expect(mockFetch).toHaveBeenCalledWith(
        '/test',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify({ foo: 'bar' }),
        }),
      );
    });

    it('should handle different response types', async () => {
      const instance = createFetchInstance();

      // Text
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers(),
        text: () => Promise.resolve('plain text'),
      });

      const textResponse = await instance.get('/test', { responseType: 'text' });

      expect(textResponse.data).toBe('plain text');

      // Blob
      const blob = new Blob(['blob content']);

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers(),
        blob: () => Promise.resolve(blob),
      });

      const blobResponse = await instance.get('/test', { responseType: 'blob' });

      expect(blobResponse.data).toBe(blob);

      // ArrayBuffer
      const buffer = new ArrayBuffer(8);

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers(),
        arrayBuffer: () => Promise.resolve(buffer),
      });

      const bufferResponse = await instance.get('/test', { responseType: 'arraybuffer' });

      expect(bufferResponse.data).toBe(buffer);
    });

    it('should throw FetchError for non-ok responses', async () => {
      const instance = createFetchInstance();
      const mockResponse = {
        ok: false,
        status: 404,
        statusText: 'Not Found',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({ error: 'not found' }),
      };

      mockFetch.mockResolvedValue(mockResponse);

      try {
        await instance.get('/error');
      } catch (error) {
        expect(error).toBeInstanceOf(FetchError);

        const fetchError = error as FetchError;

        expect(fetchError.message).toBe('Request failed with status 404');
        expect(fetchError.response?.status).toBe(404);
        expect(fetchError.response?.data).toEqual({ error: 'not found' });
      }
    });

    it('should handle abort errors', async () => {
      const instance = createFetchInstance();
      const controller = new AbortController();

      const abortError = new DOMException('Aborted', 'AbortError');

      mockFetch.mockRejectedValue(abortError);

      try {
        await instance.get('/test', { signal: controller.signal });
      } catch (error) {
        expect(error).toBeInstanceOf(FetchError);
        expect((error as FetchError).code).toBe('ABORT');
        expect(isAbortError(error)).toBe(true);
      }
    });

    it('should handle auto-parsing based on content-type', async () => {
      const instance = createFetchInstance();

      // JSON content type
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({ foo: 'bar' }),
      });

      const jsonResponse = await instance.get('/test');

      expect(jsonResponse.data).toEqual({ foo: 'bar' });

      // Non-JSON but valid JSON string
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'text/plain' }),
        text: () => Promise.resolve('{"a":1}'),
      });

      const textJsonResponse = await instance.get('/test');

      expect(textJsonResponse.data).toEqual({ a: 1 });

      // Non-JSON plain text
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'text/plain' }),
        text: () => Promise.resolve('just text'),
      });

      const textResponse = await instance.get('/test');

      expect(textResponse.data).toBe('just text');
    });
  });

  describe('isAbortError', () => {
    it('should identify different types of abort errors', () => {
      expect(isAbortError(new DOMException('Aborted', 'AbortError'))).toBe(true);

      const error = new Error('Aborted');

      error.name = 'AbortError';

      expect(isAbortError(error)).toBe(true);
      expect(isAbortError(new FetchError('Aborted', undefined, 'ABORT'))).toBe(true);
      expect(isAbortError(new Error('Other'))).toBe(false);
    });
  });

  describe('isTimeoutError', () => {
    it('should identify timeout errors by code', () => {
      expect(isTimeoutError(new FetchError('Timed out', undefined, 'TIMEOUT'))).toBe(true);
      expect(isTimeoutError(new FetchError('Aborted', undefined, 'ABORT'))).toBe(false);
      expect(isTimeoutError(new Error('Other'))).toBe(false);
    });
  });

  describe('isNetworkError', () => {
    it('should identify network errors by code', () => {
      expect(isNetworkError(new FetchError('Failed', undefined, 'NETWORK'))).toBe(true);
      expect(isNetworkError(new FetchError('Aborted', undefined, 'ABORT'))).toBe(false);
      expect(isNetworkError(new Error('Other'))).toBe(false);
    });
  });

  describe('HTTP methods', () => {
    it('should perform PUT, PATCH and DELETE requests', async () => {
      const instance = createFetchInstance();

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: () => Promise.resolve({}),
      });

      await instance.put('/test', { foo: 'bar' });

      expect(mockFetch).toHaveBeenCalledWith('/test', expect.objectContaining({ method: 'PUT' }));

      await instance.patch('/test', { foo: 'bar' });

      expect(mockFetch).toHaveBeenCalledWith('/test', expect.objectContaining({ method: 'PATCH' }));

      await instance.delete('/test');

      expect(mockFetch).toHaveBeenCalledWith('/test', expect.objectContaining({ method: 'DELETE' }));
    });
  });

  describe('network errors', () => {
    it('should normalize a non-abort fetch rejection into a FetchError with code NETWORK', async () => {
      const instance = createFetchInstance();

      mockFetch.mockRejectedValue(new TypeError('Failed to fetch'));

      await expect(instance.get('/test')).rejects.toMatchObject({
        name: 'FetchError',
        code: 'NETWORK',
      });
    });
  });

  describe('explicit json responseType', () => {
    it('should parse via response.json() when responseType is json', async () => {
      const instance = createFetchInstance();

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: () => Promise.resolve({ explicit: true }),
      });

      const response = await instance.get('/test', { responseType: 'json' });

      expect(response.data).toEqual({ explicit: true });
    });
  });

  describe('non-JSON error bodies', () => {
    it('should still throw a FetchError when the error body is plain text', async () => {
      const instance = createFetchInstance();

      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        headers: new Headers({ 'content-type': 'text/plain' }),
        text: () => Promise.resolve('boom'),
      });

      await expect(instance.get('/test')).rejects.toMatchObject({
        name: 'FetchError',
        response: expect.objectContaining({ status: 500, data: 'boom' }),
      });
    });
  });

  describe('Content-Type override', () => {
    it('should not overwrite a caller-supplied Content-Type header', async () => {
      const instance = createFetchInstance();

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: () => Promise.resolve({}),
      });

      await instance.post('/test', { foo: 'bar' }, { headers: { 'Content-Type': 'application/vnd.custom+json' } });

      expect(mockFetch).toHaveBeenCalledWith(
        '/test',
        expect.objectContaining({
          headers: expect.objectContaining({ 'Content-Type': 'application/vnd.custom+json' }),
        }),
      );
    });
  });

  describe('empty / unparsable responses', () => {
    it('should mark the response with parseError instead of throwing when json() fails', async () => {
      const instance = createFetchInstance();

      mockFetch.mockResolvedValue({
        ok: true,
        status: 204,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.reject(new SyntaxError('Unexpected end of JSON input')),
      });

      const response = await instance.get('/test');

      expect(response.data).toBeUndefined();
      expect(response.parseError).toBe(true);
    });
  });

  describe('baseURL', () => {
    it('should prefix relative URLs with the configured baseURL', async () => {
      const instance = createFetchInstance({ baseURL: 'https://api.example.com/' });

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: () => Promise.resolve({}),
      });

      await instance.get('/test');

      expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/test', expect.any(Object));
    });

    it('should leave absolute URLs untouched', async () => {
      const instance = createFetchInstance({ baseURL: 'https://api.example.com' });

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: () => Promise.resolve({}),
      });

      await instance.get('https://other.example.com/test');

      expect(mockFetch).toHaveBeenCalledWith('https://other.example.com/test', expect.any(Object));
    });
  });

  describe('credentials', () => {
    it('should default to same-origin and allow per-request overrides', async () => {
      const instance = createFetchInstance();

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: () => Promise.resolve({}),
      });

      await instance.get('/test');

      expect(mockFetch).toHaveBeenCalledWith('/test', expect.objectContaining({ credentials: 'same-origin' }));

      await instance.get('/test', { credentials: 'include' });

      expect(mockFetch).toHaveBeenCalledWith('/test', expect.objectContaining({ credentials: 'include' }));
    });
  });

  describe('FormData bodies', () => {
    it('should pass FormData through untouched without forcing a JSON Content-Type', async () => {
      const instance = createFetchInstance();
      const formData = new FormData();

      formData.append('file', 'content');

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: () => Promise.resolve({}),
      });

      await instance.post('/upload', formData);

      expect(mockFetch).toHaveBeenCalledWith(
        '/upload',
        expect.objectContaining({
          body: formData,
        }),
      );

      const [, callOptions] = mockFetch.mock.calls.at(-1) as [string, { headers: Record<string, string> }];

      expect(callOptions.headers['Content-Type']).toBeUndefined();
    });
  });

  describe('timeout', () => {
    it('should abort with a TIMEOUT FetchError when the request exceeds the configured timeout', async () => {
      const instance = createFetchInstance();

      mockFetch.mockImplementation(
        (url, requestOptions: { signal?: AbortSignal }) =>
          new Promise((resolve, reject) => {
            requestOptions.signal?.addEventListener('abort', () => {
              reject(new DOMException('Aborted', 'AbortError'));
            });
          }),
      );

      await expect(instance.get('/slow', { timeout: 10 })).rejects.toMatchObject({
        name: 'FetchError',
        code: 'TIMEOUT',
      });
    });

    it('should still report ABORT when the caller signal fires before the timeout', async () => {
      const instance = createFetchInstance();
      const controller = new AbortController();

      mockFetch.mockImplementation(
        (url, requestOptions: { signal?: AbortSignal }) =>
          new Promise((resolve, reject) => {
            requestOptions.signal?.addEventListener('abort', () => {
              reject(new DOMException('Aborted', 'AbortError'));
            });
          }),
      );

      const requestPromise = instance.get('/slow', { timeout: 5000, signal: controller.signal });

      controller.abort();

      await expect(requestPromise).rejects.toMatchObject({
        name: 'FetchError',
        code: 'ABORT',
      });
    });
  });

  describe('retries', () => {
    it('should retry on a retryable status code and eventually resolve', async () => {
      const instance = createFetchInstance();

      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 503,
          statusText: 'Service Unavailable',
          headers: new Headers({ 'content-type': 'application/json' }),
          json: () => Promise.resolve({}),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: () => Promise.resolve({ recovered: true }),
        });

      const response = await instance.get('/flaky', { retries: 1 });

      expect(response.data).toEqual({ recovered: true });
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should give up after exhausting retries', async () => {
      const instance = createFetchInstance();

      mockFetch.mockRejectedValue(new TypeError('Failed to fetch'));

      await expect(instance.get('/flaky', { retries: 2 })).rejects.toMatchObject({ code: 'NETWORK' });
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should not retry on a non-retryable status code', async () => {
      const instance = createFetchInstance();

      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({}),
      });

      await expect(instance.get('/missing', { retries: 3 })).rejects.toMatchObject({
        response: expect.objectContaining({ status: 404 }),
      });
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('array query params', () => {
    it('should serialize array values as repeated keys', async () => {
      const instance = createFetchInstance();

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: () => Promise.resolve({}),
      });

      await instance.get('/test', { params: { tag: ['a', 'b'] } });

      expect(mockFetch).toHaveBeenCalledWith('/test?tag=a&tag=b', expect.any(Object));
    });
  });

  describe('XSRF token', () => {
    const originalCookieDescriptor = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie');

    afterEach(() => {
      if (originalCookieDescriptor) {
        Object.defineProperty(document, 'cookie', originalCookieDescriptor);
      }
    });

    it('should read the configured cookie and forward it as the configured header', async () => {
      Object.defineProperty(document, 'cookie', { value: 'XSRF-TOKEN=secret-token', configurable: true });

      const instance = createFetchInstance({ xsrfCookieName: 'XSRF-TOKEN', xsrfHeaderName: 'X-XSRF-TOKEN' });

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: () => Promise.resolve({}),
      });

      await instance.get('/test');

      expect(mockFetch).toHaveBeenCalledWith(
        '/test',
        expect.objectContaining({
          headers: expect.objectContaining({ 'X-XSRF-TOKEN': 'secret-token' }),
        }),
      );
    });
  });
});
