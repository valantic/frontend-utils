/**
 * Creates a debounced version of the given function that delays its execution until after
 * `delay` milliseconds have passed since the last invocation. It also provides a way to cancel
 * the debounce timer to prevent the function from being executed.
 *
 * @template T - The type of the function being debounced.
 * @param {T} func - The function to debounce. Can be synchronous or asynchronous.
 * @param {number} delay - The delay in milliseconds before executing the function.
 * @param {boolean} [immediate=false] - Whether to execute the function immediately on the leading edge.
 * @returns {Object} - Returns an object containing:
 *   - `debounced`: The debounced version of the given function.
 *   - `cancel`: A method to cancel the debounce timer.
 *
 * @example @see /tests/helpers/debounce.test.ts
 */
export default function debounce<T extends (...args: any[]) => void>(
  func: T,
  delay: number,
  immediate = false,
): {
  debounced(...args: Parameters<T>): void;
  cancel(): void;
} {
  let timeoutId: ReturnType<typeof setTimeout> | null;

  const debounced = function (...args: Parameters<T>): void {
    const callNow = immediate && !timeoutId;

    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      timeoutId = null;

      if (!immediate) {
        func(...args);
      }
    }, delay);

    if (callNow) {
      func(...args);
    }
  };

  const cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  return { debounced, cancel };
}
