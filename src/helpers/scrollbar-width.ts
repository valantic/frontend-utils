/**
 * Returns the current scrollbar width.
 *
 * Calculates the width of the scrollbar by comparing `window.innerWidth`
 * (width including scrollbars) with `document.documentElement.clientWidth`
 * (width excluding scrollbars). Returns `0` in non-browser environments.
 *
 * @returns {Number} - The width of the scrollbar in pixels.
 */
export default function scrollbarWidth(): number {
  return window.innerWidth - document.documentElement.clientWidth;
}
