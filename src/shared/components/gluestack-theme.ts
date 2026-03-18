/**
 * Gluestack theme helpers.
 *
 * These utilities keep `gluestack-ui` colors aligned with the semantic tokens
 * provided by `ThemeProvider`. Use `createGluestackColorConfig(tokens)` when
 * constructing runtime variable overrides for the generated
 * `GluestackUIProvider`.
 */

import { vars } from 'nativewind';

import type { ThemeTokens } from '@core/theme';

export type GluestackColorConfig = ReturnType<typeof vars>;

type RgbTuple = [number, number, number];

function clamp(channel: number): number {
  return Math.max(0, Math.min(255, Math.round(channel)));
}

function parseColor(value: string): RgbTuple {
  if (value.startsWith('#')) {
    const hex = value.slice(1);
    const normalized =
      hex.length === 3
        ? hex
            .split('')
            .map((char: string) => `${char}${char}`)
            .join('')
        : hex;

    return [
      parseInt(normalized.slice(0, 2), 16),
      parseInt(normalized.slice(2, 4), 16),
      parseInt(normalized.slice(4, 6), 16),
    ];
  }

  const matches = value.match(/\d+(\.\d+)?/g);
  if (!matches || matches.length < 3) {
    throw new Error(`Unsupported color format: ${value}`);
  }

  return [
    Number.parseFloat(matches[0]),
    Number.parseFloat(matches[1]),
    Number.parseFloat(matches[2]),
  ];
}

function formatColor([r, g, b]: RgbTuple): string {
  return `${clamp(r)} ${clamp(g)} ${clamp(b)}`;
}

function mix(base: string, overlay: string, overlayWeight: number): string {
  const [baseR, baseG, baseB] = parseColor(base);
  const [overlayR, overlayG, overlayB] = parseColor(overlay);
  const baseWeight = 1 - overlayWeight;

  return formatColor([
    baseR * baseWeight + overlayR * overlayWeight,
    baseG * baseWeight + overlayG * overlayWeight,
    baseB * baseWeight + overlayB * overlayWeight,
  ]);
}

export function createGluestackColorConfig(
  tokens: ThemeTokens,
): GluestackColorConfig {
  const white = '#ffffff';
  const black = '#000000';

  return vars({
    '--color-primary-400': mix(tokens.accent, white, 0.16),
    '--color-primary-500': formatColor(parseColor(tokens.accent)),
    '--color-primary-600': mix(tokens.accent, black, 0.12),
    '--color-primary-700': mix(tokens.accent, black, 0.24),
    '--color-secondary-400': mix(tokens.secondary, white, 0.16),
    '--color-secondary-500': formatColor(parseColor(tokens.secondary)),
    '--color-secondary-600': mix(tokens.secondary, black, 0.12),
    '--color-secondary-700': mix(tokens.secondary, black, 0.24),
    '--color-error-400': mix(tokens.error, white, 0.12),
    '--color-error-500': formatColor(parseColor(tokens.error)),
    '--color-error-600': mix(tokens.error, black, 0.12),
    '--color-error-700': mix(tokens.error, black, 0.24),
    '--color-success-500': formatColor(parseColor(tokens.success)),
    '--color-success-600': mix(tokens.success, black, 0.12),
    '--color-success-700': mix(tokens.success, black, 0.24),
    '--color-warning-500': formatColor(parseColor(tokens.secondary)),
    '--color-warning-600': mix(tokens.secondary, black, 0.12),
    '--color-warning-700': mix(tokens.secondary, black, 0.24),
    '--color-background-0': formatColor(parseColor(tokens.bgBase)),
    '--color-background-50': formatColor(parseColor(tokens.bgCard)),
    '--color-background-100': formatColor(parseColor(tokens.bgElevated)),
    '--color-background-200': formatColor(parseColor(tokens.bgElevated)),
    '--color-background-300': formatColor(parseColor(tokens.bgBorder)),
    '--color-background-400': formatColor(parseColor(tokens.bgBorder)),
    '--color-background-500': formatColor(parseColor(tokens.bgBorder)),
    '--color-background-error': formatColor(parseColor(tokens.errorSubtle)),
    '--color-background-warning': formatColor(
      parseColor(tokens.secondarySubtle),
    ),
    '--color-background-success': formatColor(parseColor(tokens.successSubtle)),
    '--color-background-muted': formatColor(parseColor(tokens.bgCard)),
    '--color-outline-300': formatColor(parseColor(tokens.bgBorder)),
    '--color-outline-400': formatColor(parseColor(tokens.bgBorder)),
    '--color-outline-500': formatColor(parseColor(tokens.bgBorder)),
    '--color-indicator-primary': formatColor(parseColor(tokens.accent)),
    '--color-indicator-error': formatColor(parseColor(tokens.error)),
    '--color-typography-0': formatColor(parseColor(tokens.textPrimary)),
    '--color-typography-400': formatColor(
      parseColor(tokens.textMutedForeground),
    ),
    '--color-typography-500': formatColor(parseColor(tokens.textMuted)),
    '--color-typography-700': formatColor(parseColor(tokens.textPrimary)),
    '--color-typography-800': formatColor(parseColor(tokens.textPrimary)),
    '--color-typography-900': formatColor(parseColor(tokens.textPrimary)),
    '--color-typography-950': formatColor(parseColor(tokens.textPrimary)),
  });
}
