export type ViewportSpacing = Partial<{
  top: number;
  right: number;
  bottom: number;
  left: number;
}>;

const spacingFallback = {
  top: 10,
  right: 0,
  bottom: 10,
  left: 0,
};

/**
 * Calculates whether the given DOM element is visible in the viewport.
 * Supports checking for full or partial visibility and allows custom viewport spacing.
 *
 * @param {HTMLElement | null} element - The DOM element to check.
 * @param {ViewportSpacing} viewportSpacing - Custom spacing for viewport boundaries. Defaults to spacingFallback.
 * @param {Boolean} [partial=false] - Whether to check for partial visibility (default is full visibility).
 *
 * @returns {Boolean} - Returns `true` if the element is visible in the viewport, otherwise `false`.
 *
 * @throws {Error} - Throws an error if the `element` is invalid (null or undefined).
 */
export default function isElementInViewport(
  element: HTMLElement | null,
  viewportSpacing: ViewportSpacing = spacingFallback,
  partial: boolean = false,
): boolean {
  if (!element) {
    throw new Error('Invalid element provided. The element must be a valid DOM node.');
  }

  const { top, right, bottom, left } = { ...spacingFallback, ...viewportSpacing };
  const elementRect = element.getBoundingClientRect();

  if (partial) {
    return (
      elementRect.bottom > top &&
      elementRect.right > left &&
      elementRect.top < window.innerHeight - bottom &&
      elementRect.left < window.innerWidth - right
    );
  }

  return (
    elementRect.top >= top &&
    elementRect.left >= left &&
    elementRect.bottom <= window.innerHeight - bottom &&
    elementRect.right <= window.innerWidth - right
  );
}
