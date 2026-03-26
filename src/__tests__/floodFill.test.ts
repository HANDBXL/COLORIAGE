import { describe, it, expect, vi } from 'vitest';
import { floodFill } from '../utils/floodFill';

// jsdom does not support canvas natively. We mock getContext to test the algorithm logic.
function createMockCanvas(width: number, height: number, bgColor: [number, number, number, number] = [255, 255, 255, 255]) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = bgColor[0];
    data[i + 1] = bgColor[1];
    data[i + 2] = bgColor[2];
    data[i + 3] = bgColor[3];
  }

  const imgData = { data, width, height };

  const ctx = {
    getImageData: vi.fn(() => ({ ...imgData, data: data })),
    putImageData: vi.fn(),
  };

  const canvas = {
    width,
    height,
    getContext: vi.fn(() => ctx),
  } as unknown as HTMLCanvasElement;

  return { canvas, data, ctx };
}

function getPixel(data: Uint8ClampedArray, width: number, x: number, y: number) {
  const pos = (y * width + x) * 4;
  return [data[pos], data[pos + 1], data[pos + 2], data[pos + 3]];
}

function setPixel(data: Uint8ClampedArray, width: number, x: number, y: number, color: [number, number, number, number]) {
  const pos = (y * width + x) * 4;
  data[pos] = color[0];
  data[pos + 1] = color[1];
  data[pos + 2] = color[2];
  data[pos + 3] = color[3];
}

describe('floodFill', () => {
  it('fills a white canvas with red', () => {
    const { canvas, data } = createMockCanvas(10, 10);
    floodFill(canvas, 5, 5, '#FF0000');
    const pixel = getPixel(data, 10, 0, 0);
    expect(pixel).toEqual([255, 0, 0, 255]);
  });

  it('does nothing if fill color matches target', () => {
    const { canvas, data, ctx } = createMockCanvas(10, 10);
    floodFill(canvas, 5, 5, '#FFFFFF');
    // putImageData should not be called since we short-circuit
    expect(ctx.putImageData).not.toHaveBeenCalled();
    // Data should be unchanged
    const pixel = getPixel(data, 10, 5, 5);
    expect(pixel).toEqual([255, 255, 255, 255]);
  });

  it('fills only connected region, stops at a barrier', () => {
    const { canvas, data } = createMockCanvas(10, 10);
    // Draw a vertical black line at x=5
    for (let y = 0; y < 10; y++) {
      setPixel(data, 10, 5, y, [0, 0, 0, 255]);
    }

    floodFill(canvas, 2, 2, '#0000FF', 0);

    // Left side should be blue
    expect(getPixel(data, 10, 0, 0)).toEqual([0, 0, 255, 255]);
    // Right side should still be white
    expect(getPixel(data, 10, 9, 0)).toEqual([255, 255, 255, 255]);
    // Barrier should be black
    expect(getPixel(data, 10, 5, 0)).toEqual([0, 0, 0, 255]);
  });

  it('handles short hex color (#RGB)', () => {
    const { canvas, data } = createMockCanvas(5, 5);
    floodFill(canvas, 0, 0, '#F00');
    expect(getPixel(data, 5, 0, 0)).toEqual([255, 0, 0, 255]);
  });

  it('handles rgb() color string', () => {
    const { canvas, data } = createMockCanvas(5, 5);
    floodFill(canvas, 0, 0, 'rgb(0, 128, 0)');
    expect(getPixel(data, 5, 0, 0)).toEqual([0, 128, 0, 255]);
  });

  it('respects tolerance for anti-aliased edges', () => {
    const { canvas, data } = createMockCanvas(10, 10);
    // Set a pixel to near-white
    setPixel(data, 10, 3, 3, [250, 250, 250, 255]);

    floodFill(canvas, 5, 5, '#FF0000', 20);
    // Near-white pixel should also be filled
    expect(getPixel(data, 10, 3, 3)).toEqual([255, 0, 0, 255]);
  });
});
