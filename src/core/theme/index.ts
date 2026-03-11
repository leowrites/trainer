/**
 * Theme core module
 *
 * Central design tokens — colours, spacing, typography, and breakpoints —
 * aligned with the Tailwind/NativeWind configuration in tailwind.config.js.
 *
 * Semantic tokens mirror the CSS custom-property set from the design spec:
 *   --bg, --surface, --surface2, --border, --accent, --accent2, --text, --muted, --red
 */

// ─── Raw Palette ───────────────────────────────────────────────────────────────

/** All concrete colour values used in the design system. */
// ─── Glass / Liquid Glass palette ─────────────────────────────────────────────

/**
 * Liquid Glass palette
 *
 * Translucent white layers used to simulate iOS 26's liquid glass treatment.
 * Values are RGBA strings with low alpha so underlying content (or a blur
 * layer) shows through.  Intensity levels map to the `GlassView` component's
 * `intensity` prop.
 */
export const glassPalette = {
  // Dark-mode glass fills (white-over-dark)
  darkLight: 'rgba(255, 255, 255, 0.06)',
  darkMedium: 'rgba(255, 255, 255, 0.10)',
  darkHeavy: 'rgba(255, 255, 255, 0.18)',
  darkBorder: 'rgba(255, 255, 255, 0.14)',

  // Light-mode glass fills (white-over-light)
  lightLight: 'rgba(255, 255, 255, 0.55)',
  lightMedium: 'rgba(255, 255, 255, 0.70)',
  lightHeavy: 'rgba(255, 255, 255, 0.85)',
  lightBorder: 'rgba(255, 255, 255, 0.45)',

  // Android / pre-iOS-26 solid fallback
  androidFallback: 'rgba(30, 30, 30, 0.94)',
} as const;

export const palette = {
  // Greens (primary)
  green50: '#f0fdf4',
  green100: '#dcfce7',
  green200: '#bbf7d0',
  green300: '#86efac',
  green400: '#4ade80',
  green500: '#22c55e',
  green600: '#16a34a',
  green700: '#15803d',
  green800: '#166534',
  green900: '#14532d',
  green950: '#052e16',

  // Accent (lime-green) — CSS --accent
  lime: '#c8f542',
  limeSubtle: 'rgba(200,245,66,0.1)',
  limeBorder: 'rgba(200,245,66,0.25)',

  // Secondary (amber-orange) — CSS --accent2
  amber: '#f5a742',
  amberSubtle: 'rgba(245,167,66,0.1)',
  amberBorder: 'rgba(245,167,66,0.25)',

  // Error (red) — CSS --red
  red: '#f05a4f',
  redSubtle: 'rgba(240,90,79,0.1)',
  redBorder: 'rgba(240,90,79,0.25)',

  // Neutral backgrounds — CSS --bg / --surface / --surface2 / --border
  bg: '#0e0e0e',
  surface: '#161616',
  surface2: '#1e1e1e',
  border: '#2a2a2a',

  // Text — CSS --text / --muted
  text: '#e8e8e8',
  muted: '#666666',
  mutedForeground: '#999999',

  // Pure
  white: '#ffffff',
  black: '#000000',
  transparent: 'transparent',
} as const;

export type PaletteKey = keyof typeof palette;

// ─── Semantic Token Maps ───────────────────────────────────────────────────────

export interface ThemeTokens {
  // Backgrounds
  bgBase: string;
  bgCard: string;
  bgElevated: string;
  bgBorder: string;

  // Text
  textPrimary: string;
  textMuted: string;
  textMutedForeground: string;

  // Brand / accent colours
  accent: string;
  accentSubtle: string;
  accentBorder: string;
  accentForeground: string;

  secondary: string;
  secondarySubtle: string;
  secondaryBorder: string;
  secondaryForeground: string;

  // Status
  error: string;
  errorSubtle: string;
  errorBorder: string;
  errorForeground: string;

  // Glass / Liquid Glass
  /** Translucent fill for a light-intensity glass surface. */
  glassFillLight: string;
  /** Translucent fill for a medium-intensity glass surface. */
  glassFillMedium: string;
  /** Translucent fill for a heavy-intensity glass surface. */
  glassFillHeavy: string;
  /** Semi-transparent border that separates glass from its backdrop. */
  glassBorder: string;
  /** Solid fallback background used on platforms without glass support. */
  glassFallback: string;
}

/**
 * Semantic colour tokens for the **dark** theme.
 * These map to the CSS custom properties in the design spec.
 */
export const darkTokens: ThemeTokens = {
  // Backgrounds
  bgBase: palette.bg,
  bgCard: palette.surface,
  bgElevated: palette.surface2,
  bgBorder: palette.border,

  // Text
  textPrimary: palette.text,
  textMuted: palette.muted,
  textMutedForeground: palette.mutedForeground,

  // Brand / accent colours
  accent: palette.lime,
  accentSubtle: palette.limeSubtle,
  accentBorder: palette.limeBorder,
  accentForeground: palette.black,

  secondary: palette.amber,
  secondarySubtle: palette.amberSubtle,
  secondaryBorder: palette.amberBorder,
  secondaryForeground: palette.black,

  // Status
  error: palette.red,
  errorSubtle: palette.redSubtle,
  errorBorder: palette.redBorder,
  errorForeground: palette.white,

  // Glass / Liquid Glass
  glassFillLight: glassPalette.darkLight,
  glassFillMedium: glassPalette.darkMedium,
  glassFillHeavy: glassPalette.darkHeavy,
  glassBorder: glassPalette.darkBorder,
  glassFallback: glassPalette.androidFallback,
};

/**
 * Semantic colour tokens for the **light** theme.
 * Inverts/lightens values to provide a readable light-mode palette.
 */
export const lightTokens: ThemeTokens = {
  // Backgrounds
  bgBase: '#f5f5f5',
  bgCard: '#ffffff',
  bgElevated: '#ebebeb',
  bgBorder: '#d4d4d4',

  // Text
  textPrimary: '#0e0e0e',
  textMuted: '#888888',
  textMutedForeground: '#aaaaaa',

  // Brand / accent colours (same hues, readable on light bg)
  accent: '#6abf00',
  accentSubtle: 'rgba(106,191,0,0.1)',
  accentBorder: 'rgba(106,191,0,0.25)',
  accentForeground: palette.white,

  secondary: '#c97800',
  secondarySubtle: 'rgba(201,120,0,0.1)',
  secondaryBorder: 'rgba(201,120,0,0.25)',
  secondaryForeground: palette.white,

  // Status
  error: '#d93025',
  errorSubtle: 'rgba(217,48,37,0.1)',
  errorBorder: 'rgba(217,48,37,0.25)',
  errorForeground: palette.white,

  // Glass / Liquid Glass
  glassFillLight: glassPalette.lightLight,
  glassFillMedium: glassPalette.lightMedium,
  glassFillHeavy: glassPalette.lightHeavy,
  glassBorder: glassPalette.lightBorder,
  glassFallback: '#f0f0f0',
};

export type ColorMode = 'dark' | 'light';

// ─── Typography Scale ─────────────────────────────────────────────────────────

export const typography = {
  size: {
    /** 9 px — smallest labels / warmup tags */
    xs: 9,
    /** 10 px — card labels, metadata */
    sm: 10,
    /** 11 px — secondary body, stat sub-labels */
    base: 11,
    /** 13 px — primary body, default */
    body: 13,
    /** 14 px — stat units, slightly larger body */
    md: 14,
    /** 18 px — activity icons */
    lg: 18,
    /** 20 px — weight steps */
    xl: 20,
    /** 32 px — small stat value */
    '2xl': 32,
    /** 36 px — logo */
    '3xl': 36,
    /** 42 px — large stat value */
    '4xl': 42,
  },
  weight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
  lineHeight: {
    tight: 1,
    normal: 1.6,
  },
  letterSpacing: {
    tight: -1,
    normal: 0,
    wide: 0.05,
    wider: 0.08,
    widest: 0.15,
  },
} as const;

// ─── Spacing Scale ────────────────────────────────────────────────────────────

export const spacing = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
} as const;

// ─── Legacy export (backward-compatible) ──────────────────────────────────────

/** @deprecated Use `darkTokens` / `lightTokens` + `useTheme()` instead. */
export const colors = {
  primary: {
    50: palette.green50,
    100: palette.green100,
    200: palette.green200,
    300: palette.green300,
    400: palette.green400,
    500: palette.green500,
    600: palette.green600,
    700: palette.green700,
    800: palette.green800,
    900: palette.green900,
    950: palette.green950,
  },
  surface: {
    DEFAULT: palette.bg,
    card: palette.surface,
    elevated: palette.surface2,
    border: palette.border,
  },
  text: {
    primary: palette.text,
    secondary: 'rgba(232,232,232,0.6)',
    muted: palette.muted,
  },
  accent: {
    DEFAULT: palette.lime,
    subtle: palette.limeSubtle,
    border: palette.limeBorder,
  },
  secondary: {
    DEFAULT: palette.amber,
    subtle: palette.amberSubtle,
    border: palette.amberBorder,
  },
  error: {
    DEFAULT: palette.red,
    subtle: palette.redSubtle,
    border: palette.redBorder,
  },
} as const;

export type ThemeColors = typeof colors;
export type ColorToken = keyof ThemeColors;
