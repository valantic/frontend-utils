import { describe, expect, it } from 'vitest';
import isElementInViewport from '@/helpers/is-element-in-viewport';

// Mock DOM elements for testing
const createMockElement = (rect: Partial<DOMRect>): HTMLElement => {
  const element = document.createElement('div');

  element.getBoundingClientRect = (): DOMRect => ({
    top: rect.top ?? 0,
    left: rect.left ?? 0,
    bottom: rect.bottom ?? 0,
    right: rect.right ?? 0,
    width: rect.width ?? 0,
    height: rect.height ?? 0,
    x: rect.x ?? 0,
    y: rect.y ?? 0,
    toJSON: () => rect.toString(),
  });

  return element;
};

describe('isElementInViewport', () => {
  it('should return true when element is fully visible in the viewport', () => {
    const element = createMockElement({
      top: 50,
      left: 50,
      bottom: 150,
      right: 150,
    });
    const result = isElementInViewport(element);

    expect(result).toBe(true);
  });

  it('should return false when element is completely outside the viewport', () => {
    const element = createMockElement({
      top: -200,
      left: -200,
      bottom: -100,
      right: -100,
    });
    const result = isElementInViewport(element);

    expect(result).toBe(false);
  });

  it('should account for viewport spacing (top)', () => {
    const element = createMockElement({
      top: 5,
      left: 50,
      bottom: 150,
      right: 150,
    });
    const result = isElementInViewport(element, { top: 10 });

    expect(result).toBe(false); // Not visible due to `top` spacing
  });

  it('should account for viewport spacing (bottom)', () => {
    const element = createMockElement({
      top: 50,
      left: 50,
      bottom: window.innerHeight + 15,
      right: 150,
    });
    const result = isElementInViewport(element, { bottom: 20 });

    expect(result).toBe(false); // Not visible due to `bottom` spacing
  });

  it('should account for viewport spacing (left & right)', () => {
    const element = createMockElement({
      top: 50,
      left: -20,
      bottom: 150,
      right: window.innerWidth + 20,
    });
    const result = isElementInViewport(element, { left: 0, right: 10 });

    expect(result).toBe(false); // Not fully inside viewport
  });

  it('should return true for partial visibility when `partial` is true', () => {
    const element = createMockElement({
      top: -50,
      left: 50,
      bottom: 150,
      right: 150,
    });
    const result = isElementInViewport(element, {}, true); // Partial visibility enabled

    expect(result).toBe(true);
  });

  it('should return false for partial visibility if element is completely outside', () => {
    const element = createMockElement({
      top: -300,
      left: -300,
      bottom: -200,
      right: -200,
    });
    const result = isElementInViewport(element, {}, true);

    expect(result).toBe(false); // Completely outside
  });

  it('should use default spacing when no spacing is provided', () => {
    const element = createMockElement({
      top: 10,
      left: 0,
      bottom: window.innerHeight - 10,
      right: window.innerWidth,
    });
    const result = isElementInViewport(element);

    expect(result).toBe(true); // Fully visible
  });

  it('should throw an error if the element is null', () => {
    expect(() => isElementInViewport(null)).toThrowError(
      'Invalid element provided. The element must be a valid DOM node.',
    );
  });

  it('should handle edge cases with large elements spanning across viewport', () => {
    const element = createMockElement({
      top: -10,
      left: -10,
      bottom: window.innerHeight + 10,
      right: window.innerWidth + 10,
    });
    const result = isElementInViewport(element, {}, true);

    expect(result).toBe(true); // Partially visible
  });

  it('should return false for an element just outside the viewport', () => {
    const element = createMockElement({
      top: -1,
      left: -1,
      bottom: window.innerHeight + 1,
      right: window.innerWidth + 1,
    });
    const result = isElementInViewport(element, { top: 10, bottom: 10, left: 10, right: 10 });

    expect(result).toBe(false); // Outside due to spacing
  });

  it('should ignore spacingFallback when custom values are provided', () => {
    const element = createMockElement({
      top: 50,
      left: 50,
      bottom: window.innerHeight - 5,
      right: window.innerWidth - 5,
    });
    const result = isElementInViewport(element, { top: 0, bottom: 0, left: 0, right: 0 });

    expect(result).toBe(true); // Fully visible with no custom spacing
  });
});
