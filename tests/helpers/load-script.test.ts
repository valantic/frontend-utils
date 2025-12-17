import { beforeEach, describe, expect, it, vi } from 'vitest';
import loadScript, { scriptMapping } from '@/helpers/load-script';

const scriptSrc = 'https://example.com/script.js';
const scriptSrc1 = 'https://example.com/script1.js';
const scriptSrc2 = 'https://example.com/script2.js';

describe('loadScript', () => {
  beforeEach(() => {
    // Reset DOM and state between tests
    document.head.innerHTML = '';
  });

  it('should dynamically load a script into the DOM', async () => {
    loadScript(scriptSrc);

    const scriptTag = document.querySelector(`script[src="${scriptSrc}"]`) as HTMLScriptElement;

    expect(scriptTag).not.toBeNull(); // Script should be added to the DOM
    expect(scriptTag?.src).toBe(scriptSrc);
    expect(scriptMapping.loadingQueue).toContain(scriptSrc); // Script should be in the loading queue
  });

  it('should attach additional attributes to the script element', async () => {
    const attributes = {
      type: 'module',
      crossorigin: 'anonymous',
      integrity: 'sha384-abc123',
    };

    loadScript(scriptSrc, undefined, attributes);

    const scriptTag = document.querySelector(`script[src="${scriptSrc}"]`) as HTMLScriptElement;

    expect(scriptTag).not.toBeNull(); // Script should be added to the DOM
    expect(scriptTag?.getAttribute('type')).toBe('module');
    expect(scriptTag?.getAttribute('crossorigin')).toBe('anonymous');
    expect(scriptTag?.getAttribute('integrity')).toBe('sha384-abc123');
  });

  it('should set default defer and async attributes if not provided', async () => {
    loadScript(scriptSrc);

    const scriptTag = document.querySelector(`script[src="${scriptSrc}"]`) as HTMLScriptElement;

    expect(scriptTag).not.toBeNull(); // Script should be added to the DOM
    expect(scriptTag?.defer).toBe(true); // Default defer attribute
    expect(scriptTag?.async).toBe(true); // Default async attribute
  });

  it('should execute the callback after the script is loaded', async () => {
    const mockCallback = vi.fn();
    // Mock script load behavior
    const originalCreateElement = document.createElement;

    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      const element = originalCreateElement.call(document, tagName);

      if (tagName === 'script') {
        setTimeout(() => {
          element.dispatchEvent(new Event('load')); // Simulate script load event
        }, 100);
      }

      return element;
    });

    loadScript(scriptSrc, mockCallback);

    await new Promise((resolve) => setTimeout(resolve, 150)); // Wait for the `load` event

    expect(mockCallback).toHaveBeenCalledTimes(1); // Callback should be called once
    expect(scriptMapping.loadingQueue).not.toContain(scriptSrc); // Script should be removed from the queue
  });

  it('should add multiple callbacks for the same loading script', async () => {
    const mockCallback1 = vi.fn();
    const mockCallback2 = vi.fn();
    // Mock script load behavior
    const originalCreateElement = document.createElement;

    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      const element = originalCreateElement.call(document, tagName);

      if (tagName === 'script') {
        setTimeout(() => {
          element.dispatchEvent(new Event('load')); // Simulate script load event
        }, 100);
      }

      return element;
    });

    loadScript(scriptSrc, mockCallback1);
    loadScript(scriptSrc, mockCallback2);

    expect(scriptMapping.loadingQueue).toEqual([scriptSrc]); // Both callbacks should be registered

    await new Promise((resolve) => setTimeout(resolve, 150)); // Wait for the `load` event

    expect(mockCallback1).toHaveBeenCalledTimes(1);
    expect(mockCallback2).toHaveBeenCalledTimes(1);
    expect(scriptMapping.loadingQueue).not.toContain(scriptSrc); // Script should be removed from the queue
  });

  it('should execute callback immediately if the script is already loaded', async () => {
    const mockCallback = vi.fn();

    // Simulate script already loaded
    const existingScript = document.createElement('script');

    existingScript.src = scriptSrc;
    document.head.append(existingScript);

    loadScript(scriptSrc, mockCallback);

    expect(mockCallback).toHaveBeenCalledTimes(1); // Callback should execute immediately
  });

  it('should track script in scriptMapping.loadingQueue while loading', async () => {
    const mockCallback = vi.fn();
    // Mock script load behavior
    const originalCreateElement = document.createElement;

    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      const element = originalCreateElement.call(document, tagName);

      if (tagName === 'script') {
        setTimeout(() => {
          element.dispatchEvent(new Event('load')); // Simulate script load event
        }, 100);
      }

      return element;
    });

    loadScript(scriptSrc, mockCallback);

    expect(scriptMapping.loadingQueue).toContain(scriptSrc); // Script should be tracked in the queue

    await new Promise((resolve) => setTimeout(resolve, 150)); // Wait for the `load` event

    expect(scriptMapping.loadingQueue).not.toContain(scriptSrc); // Script should be removed from the queue
  });

  it('should handle loading multiple scripts sequentially', async () => {
    const mockCallback1 = vi.fn();
    const mockCallback2 = vi.fn();
    // Mock script load behavior
    const originalCreateElement = document.createElement;

    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      const element = originalCreateElement.call(document, tagName);

      if (tagName === 'script') {
        setTimeout(() => {
          element.dispatchEvent(new Event('load')); // Simulate script load event
        }, 100);
      }

      return element;
    });

    loadScript(scriptSrc1, mockCallback1);
    loadScript(scriptSrc2, mockCallback2);

    await new Promise((resolve) => setTimeout(resolve, 250)); // Wait for both scripts to load

    expect(mockCallback1).toHaveBeenCalledTimes(1);
    expect(mockCallback2).toHaveBeenCalledTimes(1);
  });
});
