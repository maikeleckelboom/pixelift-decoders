export const SERVER_MIME_TYPES: Record<string, `image/${string}`> = {
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  // avif: 'image/avif',
  gif: 'image/gif'
} as const;

const BROWSER_MIME_TYPES: Record<string, `image/${string}`> = {
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  heic: 'image/heic',
  gif: 'image/gif'
} as const;

export function listServerSupportedExtensions(): string[] {
  return Object.keys(SERVER_MIME_TYPES);
}

export function listBrowserSupportedExtensions() {
  return Object.keys(BROWSER_MIME_TYPES);
}

export function getMimeTypeForExtension(
  extension: string,
  browser = false
): `image/${string}` | undefined {
  const mimeTypes = browser ? BROWSER_MIME_TYPES : SERVER_MIME_TYPES;
  return mimeTypes[extension as keyof typeof mimeTypes];
}
