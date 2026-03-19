/**
 * Theme context
 *
 * Provides a React context that distributes semantic colour tokens throughout
 * the component tree.  By default the colour mode follows the device system
 * preference (`useColorScheme`), but it can be overridden via the
 * `colorMode` prop on `ThemeProvider`.
 *
 * Usage:
 *   // In App.tsx — wrap the tree once:
 *   <ThemeProvider>…</ThemeProvider>
 *
 *   // Inside any component:
 *   const { tokens, colorMode } = useTheme();
 *   const bg = { backgroundColor: tokens.bgCard };
 */

import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme, View } from 'react-native';

import {
  darkTokens,
  lightTokens,
  type ColorMode,
  type ThemeTokens,
} from './index';
import { createNativeWindThemeVars } from './nativewind-theme';

// ─── Context ───────────────────────────────────────────────────────────────────

interface ThemeContextValue {
  /** Resolved semantic colour tokens for the active colour mode. */
  tokens: ThemeTokens;
  /** Active colour mode ('dark' | 'light'). */
  colorMode: ColorMode;
}

const ThemeContext = createContext<ThemeContextValue>({
  tokens: darkTokens,
  colorMode: 'dark',
});

// ─── Provider ─────────────────────────────────────────────────────────────────

interface ThemeProviderProps {
  /**
   * Explicitly override the colour mode.
   * Defaults to the device system preference via `useColorScheme()`.
   */
  colorMode?: ColorMode;
  children: React.ReactNode;
}

/**
 * `ThemeProvider`
 *
 * Wrap your application root with this provider to make theme tokens
 * available to all child components via `useTheme()`.
 *
 * ```tsx
 * <ThemeProvider>
 *   <App />
 * </ThemeProvider>
 * ```
 *
 * You can pin a specific colour mode (e.g. for testing / Storybook):
 *
 * ```tsx
 * <ThemeProvider colorMode="light">
 *   <App />
 * </ThemeProvider>
 * ```
 */
export function ThemeProvider({
  colorMode: forcedMode,
  children,
}: ThemeProviderProps): React.JSX.Element {
  const systemScheme = useColorScheme();

  const colorMode: ColorMode = useMemo(() => {
    if (forcedMode) return forcedMode;
    return systemScheme === 'light' ? 'light' : 'dark';
  }, [forcedMode, systemScheme]);

  const tokens: ThemeTokens = colorMode === 'light' ? lightTokens : darkTokens;
  const nativeWindTheme = useMemo(
    () => createNativeWindThemeVars(tokens),
    [tokens],
  );

  const value = useMemo(() => ({ tokens, colorMode }), [tokens, colorMode]);

  return (
    <ThemeContext.Provider value={value}>
      {/*
       * Apply the NativeWind `dark` class when the active colour mode is dark.
       * This activates all `dark:` prefixed utility classes within the subtree,
       * so components can define both light and dark variants:
       *   <View className="bg-white dark:bg-surface" />
       */}
      <View
        className={`flex-1 ${colorMode === 'dark' ? 'dark' : ''}`}
        style={[nativeWindTheme, { backgroundColor: tokens.bgBase }]}
      >
        {children}
      </View>
    </ThemeContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * `useTheme`
 *
 * Returns the active colour tokens and the current colour mode.
 * Components that call this hook will re-render when the colour mode changes.
 *
 * **Requires** a `ThemeProvider` ancestor.  Falls back gracefully to dark
 * tokens if called outside one (e.g. in unit tests without a provider).
 *
 * ```tsx
 * const { tokens, colorMode } = useTheme();
 * const style = { backgroundColor: tokens.bgCard };
 * ```
 */
export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
