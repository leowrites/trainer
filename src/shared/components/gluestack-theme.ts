/**
 * Gluestack theme helpers.
 *
 * These utilities keep `gluestack-ui` colors aligned with the semantic tokens
 * provided by `ThemeProvider`. Use `createGluestackColorConfig(tokens)` when
 * constructing the `GluestackUIProvider` config.
 */

import type { ThemeTokens } from '@core/theme';

export interface GluestackColorConfig {
  colors: {
    background: string;
    backgroundElevated: string;
    surface: string;
    surfaceElevated: string;
    border: string;
    accent: string;
    accentSubtle: string;
    textPrimary: string;
    textMuted: string;
    error: string;
  };
}

export function createGluestackColorConfig(
  tokens: ThemeTokens,
): GluestackColorConfig {
  return {
    colors: {
      background: tokens.bgBase,
      backgroundElevated: tokens.bgElevated,
      surface: tokens.bgCard,
      surfaceElevated: tokens.bgElevated,
      border: tokens.bgBorder,
      accent: tokens.accent,
      accentSubtle: tokens.accentSubtle,
      textPrimary: tokens.textPrimary,
      textMuted: tokens.textMuted,
      error: tokens.error,
    },
  };
}
