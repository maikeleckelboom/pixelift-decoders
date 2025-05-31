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
