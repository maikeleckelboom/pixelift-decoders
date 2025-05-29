Got it! Here’s the updated concise README snippet with your function named `decode` — polished and clear for your lib users:

---

# Pixelift — Image Decode Library

## Features

* Universal image decoding with pooled OffscreenCanvas (browser only)
* Minimal and efficient core API
* Optional concurrency limiting utility for high-throughput scenarios (e.g. virtual scrolling)
* Built-in cancellation support via `AbortSignal`

---

## Quickstart

```ts
import { decode } from 'pixelift';

// Basic decode without concurrency limit
const pixelData = await decode(imageData);
```

---

## Handling Fast Incoming Decode Requests (Virtual Lists, Galleries)

When your app rapidly requests many decode operations (like in a virtual scroll list with thousands of items), uncontrolled concurrency can overwhelm the system:

* High CPU and memory usage
* UI freezes or jank
* Slow decode responses

### Solution: Limit concurrent decodes with `createConcurrencyPool`

```ts
import { decode, createConcurrencyPool } from 'pixelift';

// Create a concurrency limiter with max 5 simultaneous decodes
const limitDecodes = createConcurrencyPool(5);

async function decodeWithLimit(imageData: ImageData) {
  // Wrap decode call to respect concurrency limit
  return limitDecodes(() => decode(imageData));
}
```

### Usage in Virtual Scroll (React example)

```tsx
function VirtualListItem({ imageData }) {
  const [pixels, setPixels] = React.useState(null);

  React.useEffect(() => {
    const controller = new AbortController();

    decodeWithLimit(imageData, { signal: controller.signal })
      .then(setPixels)
      .catch((err) => {
        if (err.name !== 'AbortError') console.error(err);
      });

    return () => controller.abort(); // Cancel decode if item unmounts or scroll changes
  }, [imageData]);

  return <Canvas pixels={pixels} />;
}
```

---

## Core API

```ts
/**
 * Decode image data to pixel data.
 * Supports cancellation via AbortSignal.
 */
async function decode(
  imageData: ImageData,
  options?: { signal?: AbortSignal }
): Promise<PixelData>;
```

---

## Concurrency Limiting Utility

```ts
/**
 * Create a concurrency limiter to cap simultaneous async tasks.
 * Returns a function that wraps tasks and limits concurrency.
 */
function createConcurrencyPool(limit: number): <T>(task: () => Promise<T>) => Promise<T>;
```

Use it to **wrap decode calls** to keep UI responsive and resource usage stable under load.

---

## Summary

* Use `decode()` for simple cases
* Use `createConcurrencyPool()` to manage decode concurrency in heavy-load apps
* Combine concurrency limiting with `AbortSignal` for responsive cancellation

---
