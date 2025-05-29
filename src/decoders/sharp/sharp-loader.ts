import { default as SharpInstance } from 'sharp';

export type Sharp = typeof SharpInstance;

let _sharp: Sharp | null = null;

export async function importSharp(): Promise<Sharp> {
  if (_sharp) return _sharp;

  try {
    return (_sharp = (await import('sharp')).default);
  } catch (error) {
    _sharp = null;
    const msg = createErrorMessage(error);
    const err = new Error(msg);
    err.name = 'SharpLoaderError';
    if (error instanceof Error) err.cause = error;
    throw err;
  }
}

function createErrorMessage(error: unknown): string {
  if (isMissingError(error)) {
    return `
❌ Missing \`sharp\` package (required for server image processing)

💡 Install with:
   npm install sharp
   pnpm add sharp
   yarn add sharp
   bun add sharp

⚠️ Pixelift requires \`sharp\` for server features
   Check installation and Node.js version (v18+ recommended)
`.trim();
  }

  return `
❌ Unexpected \`sharp\` load error:

${error instanceof Error ? error.message : String(error)}

💡 Common installation issues:
   1. Node.js version mismatch: Requires v18+
   2. Missing build tools: Install Python, node-gyp and compiler tools
   3. Platform architecture mismatch: Try \`npm install --platform=linux --arch=x64 sharp\`
   4. Global libvips conflict: Set \`SHARP_IGNORE_GLOBAL_LIBVIPS=1\`
   5. Permission issues: Use \`--unsafe-perm\` with npm

📖 See troubleshooting guide: https://sharp.pixelplumbing.com/install
`.trim();
}

function isMissingError(error: unknown): boolean {
  return (
    error instanceof Error &&
    'code' in error &&
    error.code === 'MODULE_NOT_FOUND' &&
    /sharp/.test(error.message)
  );
}
