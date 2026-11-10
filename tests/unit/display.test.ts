import { it, expect } from 'vitest';
import { boardDisplay, MAX_BACKING_PIXELS } from '../../src/game/Display';
it('uses actual display density without changing CSS/world size', () => {
  for (const dpr of [1, 2, 3]) {
    const d = boardDisplay(364, 469, dpr);
    expect(d.cssWidth).toBe(364);
    expect(d.cssHeight).toBe(469);
    expect(d.width).toBe(364 * dpr);
    expect(d.height).toBe(469 * dpr);
    expect(d.density).toBe(dpr);
  }
  const desktop = boardDisplay(1284, 575, 2);
  expect(desktop.density).toBe(2);
  expect(desktop.width).toBe(2568);
});
it('bounds backing memory on oversized monitors and tolerates hidden/invalid ratios', () => {
  const d = boardDisplay(4000, 2400, 4);
  expect(d.width * d.height).toBeLessThanOrEqual(4000 * 2400);
  expect(d.density).toBe(1);
  const bounded = boardDisplay(2000, 1200, 3);
  expect(bounded.width * bounded.height).toBeLessThanOrEqual(MAX_BACKING_PIXELS + 5000);
  expect(boardDisplay(0, 0, 0)).toMatchObject({ cssWidth: 1, cssHeight: 1, density: 1 });
});
