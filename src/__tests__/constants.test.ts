import { describe, it, expect } from 'vitest';
import {
  CANVAS_MIN_RESOLUTION,
  ZOOM_SENSITIVITY, ZOOM_MIN, ZOOM_MAX,
  DEFAULT_COLOR, DEFAULT_LINE_WIDTH, DEFAULT_OPACITY,
  BRUSH_WIDTH_MIN, BRUSH_WIDTH_MAX,
  OPACITY_MIN, OPACITY_MAX,
  MAX_HISTORY_STEPS,
  AUTOSAVE_DEBOUNCE_MS,
} from '../constants';

describe('constants', () => {
  it('has valid canvas resolution', () => {
    expect(CANVAS_MIN_RESOLUTION).toBeGreaterThanOrEqual(1000);
  });

  it('has valid zoom bounds', () => {
    expect(ZOOM_MIN).toBeLessThan(ZOOM_MAX);
    expect(ZOOM_SENSITIVITY).toBeGreaterThan(0);
  });

  it('has valid brush defaults', () => {
    expect(DEFAULT_LINE_WIDTH).toBeGreaterThan(0);
    expect(DEFAULT_OPACITY).toBeGreaterThan(0);
    expect(DEFAULT_OPACITY).toBeLessThanOrEqual(100);
    expect(DEFAULT_COLOR).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });

  it('has valid brush limits', () => {
    expect(BRUSH_WIDTH_MIN).toBeLessThan(BRUSH_WIDTH_MAX);
    expect(OPACITY_MIN).toBeLessThan(OPACITY_MAX);
  });

  it('has valid history limit', () => {
    expect(MAX_HISTORY_STEPS).toBeGreaterThanOrEqual(10);
  });

  it('has valid autosave debounce', () => {
    expect(AUTOSAVE_DEBOUNCE_MS).toBeGreaterThanOrEqual(500);
  });
});
