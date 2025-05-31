export function isValidUrl(input: string) {
  try {
    new URL(input);
    return true;
  } catch {
    return false;
  }
}

export function isBufferSource(input: unknown): input is BufferSource {
  return (
    input instanceof ArrayBuffer ||
    (typeof ArrayBuffer !== 'undefined' && ArrayBuffer.isView(input))
  );
}
