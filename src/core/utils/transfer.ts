// File: src/core/utils/transfer.ts

/**
 * Recursively collects all transferable objects from an input value.
 * Supports common transferable types like ArrayBuffer, TypedArrays,
 * ImageBitmap, OffscreenCanvas, MessagePort, and nested arrays/objects.
 *
 * @param value The value to extract transferables from.
 * @returns Array of transferable objects ready for postMessage transfer list.
 */
export function getTransferList(value: unknown): Transferable[] {
  const transferList: Transferable[] = [];
  const seen = new Set<unknown>();

  function collect(val: unknown) {
    if (val === null || val === undefined) return;
    if (seen.has(val)) return;

    if (
      val instanceof ArrayBuffer ||
      val instanceof MessagePort ||
      val instanceof ImageBitmap ||
      (typeof OffscreenCanvas !== 'undefined' && val instanceof OffscreenCanvas)
    ) {
      seen.add(val);
      transferList.push(val);
    } else if (ArrayBuffer.isView(val)) {
      seen.add(val);
      if (!seen.has(val.buffer)) {
        transferList.push(val.buffer);
        seen.add(val.buffer);
      }
    } else if (Array.isArray(val)) {
      seen.add(val);
      for (const item of val) collect(item);
    } else if (typeof val === 'object') {
      seen.add(val);
      for (const key in val) {
        if (Object.prototype.hasOwnProperty.call(val, key)) {
          collect((val as any)[key]);
        }
      }
    }
  }

  collect(value);
  return transferList;
}
