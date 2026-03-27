/**
 * Theme core module
 *
 * Central design tokens — colours, spacing, typography, and breakpoints —
 * aligned with the Tailwind/NativeWind configuration in tailwind.config.js.
 */

// ─── Raw Palette ───────────────────────────────────────────────────────────────

/** All concrete colour values used in the design system. */
export const palette = {
  primary50: '#eef2ff',
  primary100: '#e0e8ff',
  primary200: '#cad7ff',
  primary300: '#aebfff',
  primary400: '#8ea7ff',
  primary500: '#6c8cff',
  primary600: '#5878eb',
  primary700: '#4867d3',
  primary800: '#3a53aa',
  primary900: '#31468c',
  primary950: '#24325f',

  primary: '#FF6B00',
  primaryDark: '#FF6B00',
  primarySubtle: '#FFD98A',
  primarySubtleDark: '#F3C978',
  primaryBorder: '#D9C69A',
  primaryBorderDark: '#7B6D4F',

  success: '#9BCB9B',
  successDark: '#7FA983',

  secondary: '#171714',
  secondaryDark: '#F7F6F2',

  error: '#F45B5B',
  errorDark: '#FF6B6B',

  bg: '#ffffff',
  bgAlt: '#F2F1EC',
  surface: '#FFFFFF',
  surface2: '#FBFAF7',
  border: '#E8E4DC',
  borderSoft: '#DDD7CC',
  bgDark: '#171714',
  bgAltDark: '#1D1C18',
  surfaceDark: '#24231F',
  surface2Dark: '#2B2924',
  borderDark: '#353229',
  borderSoftDark: '#423E34',

  text: '#1F2328',
  muted: '#777265',
  mutedForeground: '#A29C90',
  textDark: '#F3EFE6',
  mutedDark: '#C2BAAA',
  mutedForegroundDark: '#8F8779',

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

  success: string;
  successSubtle: string;
  successBorder: string;
  successForeground: string;

  // Status
  error: string;
  errorSubtle: string;
  errorBorder: string;
  errorForeground: string;
}

export const darkTokens: ThemeTokens = {
  bgBase: palette.bgDark,
  bgCard: palette.surfaceDark,
  bgElevated: palette.surface2Dark,
  bgBorder: palette.borderDark,

  textPrimary: palette.textDark,
  textMuted: palette.mutedDark,
  textMutedForeground: palette.mutedForegroundDark,

  accent: palette.primaryDark,
  accentSubtle: palette.primarySubtleDark,
  accentBorder: palette.primaryBorderDark,
  accentForeground: palette.bgDark,

  secondary: palette.secondaryDark,
  secondarySubtle: palette.secondaryDark,
  secondaryBorder: palette.secondaryDark,
  secondaryForeground: palette.bgDark,

  success: palette.successDark,
  successSubtle: palette.successDark,
  successBorder: palette.successDark,
  successForeground: palette.bgDark,

  error: palette.errorDark,
  errorSubtle: palette.errorDark,
  errorBorder: palette.errorDark,
  errorForeground: palette.white,
};

export const lightTokens: ThemeTokens = {
  bgBase: palette.bg,
  bgCard: palette.surface2,
  bgElevated: palette.bgAlt,
  bgBorder: palette.border,

  textPrimary: palette.text,
  textMuted: palette.muted,
  textMutedForeground: palette.mutedForeground,

  accent: palette.primary,
  accentSubtle: palette.primarySubtle,
  accentBorder: palette.primaryBorder,
  accentForeground: palette.text,

  secondary: palette.secondary,
  secondarySubtle: palette.secondary,
  secondaryBorder: palette.secondary,
  secondaryForeground: palette.text,

  success: palette.success,
  successSubtle: palette.success,
  successBorder: palette.success,
  successForeground: palette.text,

  error: palette.error,
  errorSubtle: palette.error,
  errorBorder: palette.error,
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
    50: palette.primary50,
    100: palette.primary100,
    200: palette.primary200,
    300: palette.primary300,
    400: palette.primary400,
    500: palette.primary500,
    600: palette.primary600,
    700: palette.primary700,
    800: palette.primary800,
    900: palette.primary900,
    950: palette.primary950,
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
    DEFAULT: palette.primary,
    subtle: palette.primarySubtle,
    border: palette.primaryBorder,
  },
  secondary: {
    DEFAULT: palette.secondary,
    subtle: palette.secondary,
    border: palette.secondary,
  },
  error: {
    DEFAULT: palette.error,
    subtle: palette.error,
    border: palette.error,
  },
  success: {
    DEFAULT: palette.success,
    subtle: palette.success,
    border: palette.success,
  },
} as const;

export type ThemeColors = typeof colors;
export type ColorToken = keyof ThemeColors;
