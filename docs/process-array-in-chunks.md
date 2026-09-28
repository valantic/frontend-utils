# processArrayInChunks

`src/helpers/process-array-in-chunks.ts` — processes an array sequentially in fixed-size chunks, awaiting a
callback for each chunk before moving to the next.

## Usage

```ts
import processArrayInChunks from '@valantic/frontend-utils/src/helpers/process-array-in-chunks';

await processArrayInChunks([1, 2, 3, 4, 5], 2, async (chunk) => {
  await sendBatch(chunk); // called with [1, 2], then [3, 4], then [5]
});
```

- `itemsToProcess` — the array to process.
- `chunkSize` — items per chunk. Must be greater than `0`; otherwise `processArrayInChunks` throws synchronously
  (`Error('Invalid chunk size input. The chunk size has to be greater than 0.')`, not a rejected promise) before
  processing anything.
- `callback` — called once per chunk, in order, and awaited before the next chunk starts. It can be sync (return
  `void`) or async (return a `Promise<void>`); either way `processArrayInChunks` waits for it to settle before
  continuing.
- `continueOnFailure` (default `true`) — see below.

Chunking is sequential, not parallel: the next chunk's callback only starts after the current one's promise
settles.

## Error handling

- With `continueOnFailure: true` (the default), a callback that throws or rejects for one chunk does **not** stop
  processing — the remaining chunks still run — but the error itself is swallowed; the returned promise resolves
  normally and the caller has no way to observe that a chunk failed.
- With `continueOnFailure: false`, a callback error stops processing immediately (no further chunks run) and the
  promise returned by `processArrayInChunks` rejects with that same error.
- An empty `itemsToProcess` array resolves immediately without calling `callback`.
