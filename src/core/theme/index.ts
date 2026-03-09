/**
 * Theme core module
 *
 * Central design tokens — colours, spacing, typography, and breakpoints —
 * aligned with the Tailwind/NativeWind configuration in tailwind.config.js.
 */

export const colors = {
  primary: {
    50: '#f0fdf4',
    100: '#dcfce7',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
  },
  surface: {
    DEFAULT: '#0f0f0f',
    card: '#1a1a1a',
    elevated: '#242424',
  },
  text: {
    primary: '#ffffff',
    secondary: 'rgba(255,255,255,0.6)',
    muted: 'rgba(255,255,255,0.38)',
  },
} as const;

export type ColorToken = typeof colors;
