/**
 * Tests for the theme module — tokens and ThemeProvider / useTheme.
 */

import { renderHook } from '@testing-library/react-native';
import React from 'react';
import * as ReactNative from 'react-native';

import { darkTokens, lightTokens, palette, typography } from '../index';
import { ThemeProvider, useTheme } from '../theme-context';

const mockUseColorScheme = jest.spyOn(ReactNative, 'useColorScheme');

beforeEach(() => {
  mockUseColorScheme.mockReturnValue('dark');
});

afterEach(() => {
  jest.clearAllMocks();
});

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
      'success',
      'error',
    ];
    required.forEach((key) => {
      expect(darkTokens[key]).toBeTruthy();
    });
  });

  it('uses the provided dark palette values', () => {
    expect(darkTokens.bgBase).toBe(palette.bgDark);
    expect(darkTokens.bgCard).toBe(palette.surfaceDark);
    expect(darkTokens.accent).toBe(palette.primaryDark);
    expect(darkTokens.error).toBe(palette.errorDark);
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
      'success',
      'error',
    ];
    required.forEach((key) => {
      expect(lightTokens[key]).toBeTruthy();
    });
  });

  it('uses the provided light palette values', () => {
    expect(lightTokens.bgBase).toBe(palette.bg);
    expect(lightTokens.bgCard).toBe(palette.surface);
    expect(lightTokens.accent).toBe(palette.primary);
    expect(lightTokens.error).toBe(palette.error);
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

const tw = require('../../../../tailwind.config.js');

const twColors = tw.theme.extend.colors as Record<
  string,
  Record<string, string>
>;

describe('theme ↔ tailwind.config.js consistency', () => {
  it('accent.DEFAULT is driven by runtime theme variables', () => {
    expect(twColors.accent.DEFAULT).toBe(
      'rgb(var(--trainer-color-accent)/<alpha-value>)',
    );
  });

  it('secondary.DEFAULT is driven by runtime theme variables', () => {
    expect(twColors.secondary.DEFAULT).toBe(
      'rgb(var(--trainer-color-secondary)/<alpha-value>)',
    );
  });

  it('error.DEFAULT is driven by runtime theme variables', () => {
    expect(twColors.error.DEFAULT).toBe(
      'rgb(var(--trainer-color-error)/<alpha-value>)',
    );
  });

  it('surface.DEFAULT is driven by runtime theme variables', () => {
    expect(twColors.surface.DEFAULT).toBe(
      'rgb(var(--trainer-color-surface)/<alpha-value>)',
    );
  });

  it('foreground.DEFAULT is driven by runtime theme variables', () => {
    expect(twColors.foreground.DEFAULT).toBe(
      'rgb(var(--trainer-color-foreground)/<alpha-value>)',
    );
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

  it('follows system color scheme changes when no override is provided', () => {
    mockUseColorScheme.mockReturnValue('light');
    const wrapper = ({
      children,
    }: {
      children: React.ReactNode;
    }): React.JSX.Element => <ThemeProvider>{children}</ThemeProvider>;

    const { result, rerender } = renderHook(() => useTheme(), { wrapper });

    expect(result.current.colorMode).toBe('light');
    expect(result.current.tokens.bgBase).toBe(lightTokens.bgBase);

    mockUseColorScheme.mockReturnValue('dark');
    rerender({});

    expect(result.current.colorMode).toBe('dark');
    expect(result.current.tokens.bgBase).toBe(darkTokens.bgBase);
  });
});
