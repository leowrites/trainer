import { vars } from 'nativewind';

import type { ThemeTokens } from './index';

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

export type NativeWindThemeVars = ReturnType<typeof vars>;

export function createNativeWindThemeVars(
  tokens: ThemeTokens,
): NativeWindThemeVars {
  return vars({
    '--trainer-color-foreground': formatColor(parseColor(tokens.textPrimary)),
    '--trainer-color-accent': formatColor(parseColor(tokens.accent)),
    '--trainer-color-accent-subtle': formatColor(
      parseColor(tokens.accentSubtle),
    ),
    '--trainer-color-accent-border': formatColor(
      parseColor(tokens.accentBorder),
    ),
    '--trainer-color-accent-foreground': formatColor(
      parseColor(tokens.accentForeground),
    ),
    '--trainer-color-secondary': formatColor(parseColor(tokens.secondary)),
    '--trainer-color-secondary-foreground': formatColor(
      parseColor(tokens.secondaryForeground),
    ),
    '--trainer-color-success': formatColor(parseColor(tokens.success)),
    '--trainer-color-success-foreground': formatColor(
      parseColor(tokens.successForeground),
    ),
    '--trainer-color-error': formatColor(parseColor(tokens.error)),
    '--trainer-color-error-foreground': formatColor(
      parseColor(tokens.errorForeground),
    ),
    '--trainer-color-surface': formatColor(parseColor(tokens.bgBase)),
    '--trainer-color-surface-card': formatColor(parseColor(tokens.bgCard)),
    '--trainer-color-surface-elevated': formatColor(
      parseColor(tokens.bgElevated),
    ),
    '--trainer-color-surface-border': formatColor(parseColor(tokens.bgBorder)),
    '--trainer-color-muted': formatColor(parseColor(tokens.textMuted)),
    '--trainer-color-muted-foreground': formatColor(
      parseColor(tokens.textMutedForeground),
    ),
  });
}
