/**
 * Tests for the theme module — tokens and ThemeProvider / useTheme.
 */

import { renderHook } from '@testing-library/react-native';
import React from 'react';

import { darkTokens, lightTokens, palette, typography } from '../index';
import { ThemeProvider, useTheme } from '../theme-context';

// ─── Token smoke tests ────────────────────────────────────────────────────────

describe('darkTokens', () => {
  it('exposes all required token keys', () => {
    const required: (keyof typeof darkTokens)[] = [
      'bgBase',
      'bgCard',
      'bgElevated',
      'bgBorder',
      'textPrimary',
      'textMuted',
      'accent',
      'accentSubtle',
      'accentBorder',
      'accentForeground',
      'secondary',
      'error',
    ];
    required.forEach((key) => {
      expect(darkTokens[key]).toBeTruthy();
    });
  });

  it('accent matches the primary palette value', () => {
    expect(darkTokens.accent).toBe(palette.lime);
  });

  it('error is the red value from palette', () => {
    expect(darkTokens.error).toBe(palette.red);
  });
});

describe('lightTokens', () => {
  it('exposes all required token keys', () => {
    const required: (keyof typeof lightTokens)[] = [
      'bgBase',
      'bgCard',
      'bgElevated',
      'bgBorder',
      'textPrimary',
      'textMuted',
      'accent',
      'secondary',
      'error',
    ];
    required.forEach((key) => {
      expect(lightTokens[key]).toBeTruthy();
    });
  });

  it('has a lighter background than dark mode', () => {
    expect(lightTokens.bgBase).not.toBe(darkTokens.bgBase);
    expect(lightTokens.bgBase).toBe('#f3f6f9');
    expect(darkTokens.bgBase).toBe('#0f1216');
  });
});

describe('typography scale', () => {
  it('defines xs through 4xl sizes', () => {
    expect(typography.size.xs).toBeDefined();
    expect(typography.size['4xl']).toBeDefined();
  });

  it('body size is 13', () => {
    expect(typography.size.body).toBe(13);
  });
});

// ─── Token ↔ Tailwind config consistency ──────────────────────────────────────
// Ensures the `palette` / `darkTokens` values don't silently diverge from the
// static values baked into tailwind.config.js.

const tw = require('../../../../tailwind.config.js');

const twColors = tw.theme.extend.colors as Record<
  string,
  Record<string, string>
>;

describe('palette ↔ tailwind.config.js consistency', () => {
  it('accent.DEFAULT matches palette.lime', () => {
    expect(twColors.accent.DEFAULT).toBe(palette.lime);
  });

  it('secondary.DEFAULT matches palette.amber', () => {
    expect(twColors.secondary.DEFAULT).toBe(palette.amber);
  });

  it('error.DEFAULT matches palette.red', () => {
    expect(twColors.error.DEFAULT).toBe(palette.red);
  });

  it('surface.DEFAULT matches palette.bg', () => {
    expect(twColors.surface.DEFAULT).toBe(palette.bg);
  });

  it('surface.card matches palette.surface', () => {
    expect(twColors.surface.card).toBe(palette.surface);
  });

  it('surface.elevated matches palette.surface2', () => {
    expect(twColors.surface.elevated).toBe(palette.surface2);
  });

  it('surface.border matches palette.border', () => {
    expect(twColors.surface.border).toBe(palette.border);
  });

  it('muted.DEFAULT matches palette.muted', () => {
    expect(twColors.muted.DEFAULT).toBe(palette.muted);
  });

  it('foreground.DEFAULT matches palette.text', () => {
    expect(twColors.foreground.DEFAULT).toBe(palette.text);
  });
});

// ─── ThemeProvider + useTheme ─────────────────────────────────────────────────

describe('useTheme', () => {
  it('returns dark tokens by default (no provider)', () => {
    const { result } = renderHook(() => useTheme());
    expect(result.current.tokens).toEqual(darkTokens);
    expect(result.current.colorMode).toBe('dark');
  });

  it('returns dark tokens when ThemeProvider has colorMode="dark"', () => {
    const wrapper = ({
      children,
    }: {
      children: React.ReactNode;
    }): React.JSX.Element => (
      <ThemeProvider colorMode="dark">{children}</ThemeProvider>
    );
    const { result } = renderHook(() => useTheme(), { wrapper });
    expect(result.current.colorMode).toBe('dark');
    expect(result.current.tokens.bgBase).toBe(darkTokens.bgBase);
  });

  it('returns light tokens when ThemeProvider has colorMode="light"', () => {
    const wrapper = ({
      children,
    }: {
      children: React.ReactNode;
    }): React.JSX.Element => (
      <ThemeProvider colorMode="light">{children}</ThemeProvider>
    );
    const { result } = renderHook(() => useTheme(), { wrapper });
    expect(result.current.colorMode).toBe('light');
    expect(result.current.tokens.bgBase).toBe(lightTokens.bgBase);
  });
});
