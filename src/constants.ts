// ── Canvas ──
export const CANVAS_MIN_RESOLUTION = 2500;

// ── Zoom ──
export const ZOOM_SENSITIVITY = 0.0015;
export const ZOOM_MIN = 0.1;
export const ZOOM_MAX = 10;
export const ZOOM_STEP_FACTOR = 1.2;
export const ZOOM_BY_MIN = 0.05;
export const ZOOM_BY_MAX = 50;

// ── Brush defaults ──
export const DEFAULT_COLOR = '#FF0000';
export const DEFAULT_LINE_WIDTH = 5;
export const DEFAULT_OPACITY = 100;
export const DEFAULT_ERASER_WIDTH = 20;
export const DEFAULT_ERASER_OPACITY = 100;

// ── Brush limits ──
export const BRUSH_WIDTH_MIN = 1;
export const BRUSH_WIDTH_MAX = 200;
export const OPACITY_MIN = 0;
export const OPACITY_MAX = 100;

// ── Brush style multipliers ──
export const MARKER_ALPHA_FACTOR = 0.8;
export const WATERCOLOR_ALPHA_FACTOR = 0.05;
export const WATERCOLOR_SHADOW_BLUR = 4;
export const NEON_SHADOW_BLUR = 20;

// ── Export ──
export const EXPORT_FONT_SIZE_RATIO = 0.018;
export const EXPORT_FONT_SIZE_MIN = 18;
export const EXPORT_MARGIN_RATIO = 0.022;
export const EXPORT_FONT_URL = 'https://fonts.gstatic.com/s/roboto/v32/KFOlCnqEu92Fr1MmWUlfBBc4.woff2';

// ── History ──
export const MAX_HISTORY_STEPS = 50;

// ── Auto-save ──
export const AUTOSAVE_DEBOUNCE_MS = 2000;
export const AUTOSAVE_DB_NAME = 'coloriage-autosave';
export const AUTOSAVE_DB_VERSION = 1;
export const AUTOSAVE_STORE_NAME = 'canvasData';

// ── Palette storage ──
export const CUSTOM_COLORS_KEY = 'coloring_app_palette';

// ── Artist ──
export const ARTIST = 'Jean-Charles Frémont';
