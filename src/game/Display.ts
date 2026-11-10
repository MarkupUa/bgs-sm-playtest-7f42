/** Phaser 3.90 has no GameConfig.resolution. Backing size, Scale zoom and Camera zoom
 * cooperate: the board's world remains in CSS pixels; only the backing store grows. */
export const MAX_BACKING_PIXELS = 5_000_000;
export function boardDisplay(width: number, height: number, deviceRatio: number) {
  const cssWidth = Math.max(1, Math.round(width));
  const cssHeight = Math.max(1, Math.round(height));
  const density = Math.max(
    1,
    Math.min(deviceRatio || 1, 3, Math.sqrt(MAX_BACKING_PIXELS / (cssWidth * cssHeight))),
  );
  return {
    cssWidth,
    cssHeight,
    density,
    width: Math.round(cssWidth * density),
    height: Math.round(cssHeight * density),
  };
}
