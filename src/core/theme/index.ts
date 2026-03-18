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
export const palette = {
  // Greens (primary)
  green50: '#ecfdf5',
  green100: '#d1fae5',
  green200: '#a7f3d0',
  green300: '#6ee7b7',
  green400: '#34d399',
  green500: '#10b981',
  green600: '#059669',
  green700: '#047857',
  green800: '#065f46',
  green900: '#064e3b',
  green950: '#022c22',

  // Accent (emerald) — CSS --accent
  lime: '#3dd6a0',
  limeSubtle: 'rgba(61,214,160,0.14)',
  limeBorder: 'rgba(61,214,160,0.28)',

  // Secondary (steel blue) — CSS --accent2
  amber: '#7ea6c9',
  amberSubtle: 'rgba(126,166,201,0.14)',
  amberBorder: 'rgba(126,166,201,0.28)',

  // Error (red) — CSS --red
  red: '#d46a6a',
  redSubtle: 'rgba(212,106,106,0.14)',
  redBorder: 'rgba(212,106,106,0.28)',

  // Neutral backgrounds — CSS --bg / --surface / --surface2 / --border
  bg: '#0f1216',
  surface: '#161b21',
  surface2: '#1f2630',
  border: '#323c49',

  // Text — CSS --text / --muted
  text: '#edf2f7',
  muted: '#7d8998',
  mutedForeground: '#a8b2bf',

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
};

/**
 * Semantic colour tokens for the **light** theme.
 * Inverts/lightens values to provide a readable light-mode palette.
 */
export const lightTokens: ThemeTokens = {
  // Backgrounds
  bgBase: '#f3f6f9',
  bgCard: '#ffffff',
  bgElevated: '#e7edf3',
  bgBorder: '#cfd8e3',

  // Text
  textPrimary: '#15202b',
  textMuted: '#667487',
  textMutedForeground: '#8391a3',

  // Brand / accent colours (same hues, readable on light bg)
  accent: '#148f68',
  accentSubtle: 'rgba(20,143,104,0.12)',
  accentBorder: 'rgba(20,143,104,0.24)',
  accentForeground: palette.white,

  secondary: '#557da2',
  secondarySubtle: 'rgba(85,125,162,0.12)',
  secondaryBorder: 'rgba(85,125,162,0.24)',
  secondaryForeground: palette.white,

  // Status
  error: '#c65d5d',
  errorSubtle: 'rgba(198,93,93,0.12)',
  errorBorder: 'rgba(198,93,93,0.24)',
  errorForeground: palette.white,
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
    secondary: palette.mutedForeground,
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
