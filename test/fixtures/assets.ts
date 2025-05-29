export const SERVER_MIME_TYPES: Record<string, `image/${string}`> = {
    jpeg: 'image/jpeg',
    jpg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    avif: 'image/avif',
    gif: 'image/gif',
} as const;

const BROWSER_MIME_TYPES: Record<string, `image/${string}`> = {
    ...SERVER_MIME_TYPES,
    heic: 'image/heic',
    bmp: 'image/bmp'
} as const;

export const SERVER_SUPPORTED_EXTENSIONS = Object.keys(SERVER_MIME_TYPES) as Array<
    keyof typeof SERVER_MIME_TYPES
>;

const BROWSER_SUPPORTED_EXTENSIONS = Object.keys(BROWSER_MIME_TYPES) as Array<
    keyof typeof BROWSER_MIME_TYPES
>;

export interface AssetFixture {
    input: Buffer;
    mimeType: string;
    extension: string;
}

