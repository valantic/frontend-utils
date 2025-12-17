import { describe, expect, it, vi } from 'vitest';
import debounce from '@/helpers/debounce';

describe('debounce', () => {
  it('should debounce function calls with delay', async () => {
    const mockFn = vi.fn();
    const { debounced } = debounce(mockFn, 200);

    // Call the debounced function multiple times quickly
    debounced();
    debounced();
    debounced();

    // Before the delay, it should not be called yet
    expect(mockFn).not.toHaveBeenCalled();

    await new Promise((resolve) => setTimeout(resolve, 250)); // Wait for the delay

    // After the delay, it should be called once
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it('should execute the function immediately if immediate is true', () => {
    const mockFn = vi.fn();
    const { debounced } = debounce(mockFn, 200, true);

    // Call the debounced function
    debounced();

    // Should execute immediately
    expect(mockFn).toHaveBeenCalledTimes(1);

    // Call again within the delay
    debounced();
    debounced();

    // Should not execute again within the delay period
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it('should execute the function only once after the delay, even with immediate=false', async () => {
    const mockFn = vi.fn();
    const { debounced } = debounce(mockFn, 300, false);

    // Call the debounced function multiple times quickly
    debounced();
    debounced();
    debounced();

    // Should not be executed immediately
    expect(mockFn).not.toHaveBeenCalled();

    await new Promise((resolve) => setTimeout(resolve, 350)); // Wait for the delay

    // Should be executed once after the delay
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it('should cancel a scheduled debounced call', async () => {
    const mockFn = vi.fn();
    const { debounced, cancel } = debounce(mockFn, 300);

    // Call the debounced function
    debounced();

    // Cancel the debounced call
    cancel();

    await new Promise((resolve) => setTimeout(resolve, 350)); // Wait for the delay

    // Should not execute the function since it was cancelled
    expect(mockFn).not.toHaveBeenCalled();
  });

  it('should debounce async functions correctly', async () => {
    const mockFn = vi.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    const { debounced } = debounce(mockFn, 300);

    // Call the debounced async function multiple times quickly
    debounced();
    debounced();
    debounced();

    // Before the delay, the async function should not be called
    expect(mockFn).not.toHaveBeenCalled();

    await new Promise((resolve) => setTimeout(resolve, 350)); // Wait for the delay

    // After the delay, async function should be called once
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it('should handle function arguments correctly', async () => {
    const mockFn = vi.fn((message: string) => {
      // eslint-disable-next-line no-console
      console.log(message);
    });
    const { debounced } = debounce(mockFn, 200);

    // Call the debounced function with arguments
    debounced('Hello');
    debounced('World');

    await new Promise((resolve) => setTimeout(resolve, 250)); // Wait for the delay

    // After the delay, only the last call should have been executed
    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(mockFn).toHaveBeenCalledWith('World');
  });
});
