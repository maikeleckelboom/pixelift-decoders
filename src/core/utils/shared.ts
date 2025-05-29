type FitMode = 'cover' | 'contain' | 'fill';

interface DrawRect {
    sx: number; sy: number; sw: number; sh: number;
    dx: number; dy: number; dw: number; dh: number;
}

export function calculateDrawRectSharpLike(
    srcW: number,
    srcH: number,
    dstW: number,
    dstH: number,
    fit: FitMode = 'cover'
): DrawRect {
    let sx = 0, sy = 0, sw = srcW, sh = srcH;
    const dx = 0, dy = 0, dw = dstW, dh = dstH;

    const srcAspect = srcW / srcH;
    const dstAspect = dstW / dstH;

    if (fit === 'fill') {
        // No aspect ratio preservation — stretch source
        return { sx, sy, sw, sh, dx, dy, dw, dh };
    }

    if (
        (fit === 'cover' && srcAspect > dstAspect) ||
        (fit === 'contain' && srcAspect < dstAspect)
    ) {
        // Source is wider
        const newW = srcH * dstAspect;
        sx = (srcW - newW) / 2;
        sw = newW;
    } else {
        // Source is taller
        const newH = srcW / dstAspect;
        sy = (srcH - newH) / 2;
        sh = newH;
    }

    return { sx, sy, sw, sh, dx, dy, dw, dh };
}
