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

  it('accent is the lime value from palette', () => {
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
    // Light mode bgBase should be a light hex value
    expect(lightTokens.bgBase).toBe('#f5f5f5');
    expect(darkTokens.bgBase).toBe('#0e0e0e');
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
