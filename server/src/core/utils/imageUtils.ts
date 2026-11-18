import sharp from 'sharp';

export interface RgbaColor {
  r: number;
  g: number;
  b: number;
  alpha: number;
}

export const DEFAULT_SQUARE_BG: RgbaColor = { r: 255, g: 255, b: 255, alpha: 1 };
export const TRANSPARENT_BG: RgbaColor = { r: 255, g: 255, b: 255, alpha: 0 };

/**
 * Samples the outer boundaries/corners of an image to find the most seamless padding
 * color when converting to a 1:1 square canvas.
 * - If any corner has transparency (alpha < 240), returns transparent background padding.
 * - Otherwise averages the corner pixels to blend cleanly with white/off-white/solid studio backgrounds.
 * - Falls back to pure white on any error.
 */
export async function detectSquareBackground(input: Buffer | string): Promise<RgbaColor> {
  try {
    const { data, info } = await sharp(input, { limitInputPixels: 45_000_000, animated: false })
      .resize(32, 32, { fit: 'fill' })
      .raw()
      .toBuffer({ resolveWithObject: true });

    const getPixel = (x: number, y: number): { r: number; g: number; b: number; a: number } => {
      const idx = (y * info.width + x) * info.channels;
      if (info.channels === 1) {
        const v = data[idx] ?? 255;
        return { r: v, g: v, b: v, a: 255 };
      }
      return {
        r: data[idx] ?? 255,
        g: data[idx + 1] ?? 255,
        b: data[idx + 2] ?? 255,
        a: info.channels >= 4 ? (data[idx + 3] ?? 255) : 255,
      };
    };

    const corners = [
      getPixel(0, 0),
      getPixel(info.width - 1, 0),
      getPixel(0, info.height - 1),
      getPixel(info.width - 1, info.height - 1),
    ];

    const hasTransparentCorner = corners.some((c) => c.a < 240);
    if (hasTransparentCorner) {
      return TRANSPARENT_BG;
    }

    const avgR = Math.round(corners.reduce((s, c) => s + c.r, 0) / corners.length);
    const avgG = Math.round(corners.reduce((s, c) => s + c.g, 0) / corners.length);
    const avgB = Math.round(corners.reduce((s, c) => s + c.b, 0) / corners.length);
    return { r: avgR, g: avgG, b: avgB, alpha: 1 };
  } catch {
    return DEFAULT_SQUARE_BG;
  }
}
