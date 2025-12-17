import { describe, expect, it } from 'vitest';
import scrollbarWidth from '@/helpers/scrollbar-width';

describe('scrollbarWidth', () => {
  it('should return the correct scrollbar width in browser environments', () => {
    // Mock DOM values
    Object.defineProperty(window, 'innerWidth', { value: 1000, configurable: true });
    Object.defineProperty(document.documentElement, 'clientWidth', { value: 980, configurable: true });

    const width = scrollbarWidth();

    expect(width).toBe(20); // Scrollbar width is 20 pixels
  });

  it('should cache the result for repeated calls', () => {
    // Mock DOM values
    Object.defineProperty(window, 'innerWidth', { value: 1000, configurable: true });
    Object.defineProperty(document.documentElement, 'clientWidth', { value: 980, configurable: true });

    const width = scrollbarWidth();

    expect(width).toBe(20); // Initial calculation

    // Change DOM values (to test caching)
    Object.defineProperty(window, 'innerWidth', { value: 800, configurable: true });
    Object.defineProperty(document.documentElement, 'clientWidth', { value: 780, configurable: true });

    const cachedWidth = scrollbarWidth();

    expect(cachedWidth).toBe(20); // Should return cached value
  });
});
