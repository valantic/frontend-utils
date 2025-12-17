/**
 * Processes an array in chunks of a specified size, sequentially calling a callback for each chunk.
 *
 * This function is designed to handle large arrays efficiently by dividing them into smaller chunks
 * and processing them individually. The callback is invoked for each chunk and can return either a
 * Promise (for asynchronous operations) or void (for synchronous processing).
 *
 * @template T - The type of the items in the array to be processed.
 *
 * @param {T[]} itemsToProcess - The array of items to process.
 * @param {Number} chunkSize - The size of each chunk to process. Must be greater than 0.
 * @param {(chunk: T[]) => Promise<void> | void} callback - A function that will be called for each chunk.
 *        The function can perform synchronous or asynchronous operations and must handle the provided chunk.
 * @param {Boolean} [continueOnFailure=true] - Whether to continue processing subsequent chunks if the callback
 *        throws an error or fails. Defaults to `true`.
 *
 * @returns {Promise<void>} - A Promise that resolves when all chunks have been processed.
 *        If `continueOnFailure` is `false`, the Promise will reject if the callback fails for any chunk.
 *
 * @throws {Error} - Throws an error if the provided `chunkSize` is less than or equal to 0.
 *
 * @example @see /tests/helpers/process-array-in-chunks.test.ts
 */
export default function processArrayInChunks<T>( // eslint-disable-line max-params
  itemsToProcess: T[],
  chunkSize: number,
  callback: (chunk: T[]) => Promise<void> | void,
  continueOnFailure = true,
): Promise<void> {
  if (chunkSize <= 0) {
    throw new Error('Invalid chunk size input. The chunk size has to be greater than 0.');
  }

  /**
   * This function processes a chunk of the array and returns a Promise that resolves when the chunk has been processed.
   */
  const processChunk = (chunkStartIndex: number): Promise<void> => {
    if (chunkStartIndex >= itemsToProcess.length) {
      return Promise.resolve();
    }

    const chunk = itemsToProcess.slice(chunkStartIndex, chunkStartIndex + chunkSize);

    return new Promise<void>((resolve, reject) => {
      const result = callback(chunk);

      if (result instanceof Promise) {
        result
          .then(() => resolve())
          .catch((error) => {
            if (continueOnFailure) {
              resolve();
            } else {
              reject(error);
            }
          });
      } else {
        resolve();
      }
    }).then(() => processChunk(chunkStartIndex + chunkSize));
  };

  return processChunk(0);
}
