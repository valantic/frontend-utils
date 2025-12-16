import { describe, expect, it } from 'vitest';
import clone from '@/helpers/clone';

describe('clone', () => {
  it('should clone a simple object', () => {
    const obj = { one: 1, two: 'text', three: true };
    const clonedObj = clone(obj);

    expect(clonedObj).toEqual(obj); // Ensure the clone is equal to the original
    expect(clonedObj).not.toBe(obj); // Ensure the clone is not the same reference as the original
  });

  it('should clone a nested object', () => {
    const nestedObj = { one: { two: { three: 42 } } };
    const clonedNestedObj = clone(nestedObj);

    expect(clonedNestedObj).toEqual(nestedObj);
    expect(clonedNestedObj).not.toBe(nestedObj);
    expect(clonedNestedObj.one).not.toBe(nestedObj.one); // Nested objects should also be deeply cloned
  });

  it('should clone an array', () => {
    const arr = [1, 2, 3, { one: 'text' }];
    const clonedArr = clone(arr);

    expect(clonedArr).toEqual(arr);
    expect(clonedArr).not.toBe(arr);
    expect(clonedArr[3]).not.toBe(arr[3]); // Objects inside array should be cloned
  });

  it('should handle primitive values', () => {
    expect(clone(null)).toBe(null);
    expect(clone(undefined)).toBe(undefined);
    expect(clone(42)).toBe(42);
    expect(clone('text')).toBe('text');
    expect(clone(true)).toBe(true);
  });

  it('should not copy functions', () => {
    const objWithFunc = { one: 1, two: () => 'hello' };
    const clonedObj = clone(objWithFunc);

    expect(clonedObj).toEqual({ one: 1 }); // Functions are not serialized and should be omitted in the clone
  });

  it('should handle circular references gracefully (edge case)', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const circularObj: any = { one: 1 };

    circularObj.self = circularObj;

    // Cloning circular references will throw an error with JSON methods
    expect(() => clone(circularObj)).toThrow(TypeError);
  });

  it('should clone an object with empty properties', () => {
    const emptyObj = {};
    const clonedEmptyObj = clone(emptyObj);

    expect(clonedEmptyObj).toEqual(emptyObj);
    expect(clonedEmptyObj).not.toBe(emptyObj);
  });

  it('should clone an object with date values as strings', () => {
    const dateObj = { date: new Date('2025-12-15') };
    const clonedDateObj = clone(dateObj);

    expect(clonedDateObj).toEqual({ date: '2025-12-15T00:00:00.000Z' }); // Dates are serialized as ISO strings
  });
});
