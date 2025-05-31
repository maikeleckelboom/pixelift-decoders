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

export type BlobLoader = () => Promise<Blob>;

export const testImages: Record<string, BlobLoader> = {
  jpeg: () =>
    fetch(new URL('./assets/pixelift.jpeg', import.meta.url)).then((r) => r.blob()),
  jpg: () => fetch(new URL('./assets/pixelift.jpg', import.meta.url)).then((r) => r.blob()),
  png: () => fetch(new URL('./assets/pixelift.png', import.meta.url)).then((r) => r.blob()),
  gif: () => fetch(new URL('./assets/pixelift.gif', import.meta.url)).then((r) => r.blob()),
  webp: () =>
    fetch(new URL('./assets/pixelift.webp', import.meta.url)).then((r) => r.blob()),
  heic: () =>
    fetch(new URL('./assets/pixelift.heic', import.meta.url)).then((r) => r.blob()),
  animatedGif: () =>
    fetch(new URL('./assets/pixelift-animated-q100.gif', import.meta.url)).then((r) =>
      r.blob()
    ),
  animatedWebp: () =>
    fetch(new URL('./assets/pixelift-animated-q100.webp', import.meta.url)).then((r) =>
      r.blob()
    )
};
