/**
 * Creates a deep clone of the given value.
 *
 * This function performs a deep copy of the input value using `JSON.stringify` and `JSON.parse`. It is useful for
 * duplicating objects, arrays, and primitives where a deep clone is required. Note that this approach has limitations
 * when dealing with non-serializable values (e.g., functions, `undefined` in arrays/objects, symbols, or circular references).
 *
 * @param {unknown} value - The value to be cloned. Can be of any serializable type, including objects, arrays, primitives, or `null`.
 * @returns {unknown} - A deep copy of the input value. If `value` is `undefined`, it will return `undefined`.
 *                      Non-serializable values will be omitted or cause unintended behavior.
 *
 * @throws {Error} - Throws an error if the input contains circular references, as `JSON.stringify` cannot serialize them.
 *
 * @example @see /tests/helpers/clone.test.ts
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function clone(value: any): any {
  if (value === undefined) {
    return value;
  }

  return JSON.parse(JSON.stringify(value)); // eslint-disable-line unicorn/prefer-structured-clone
}
