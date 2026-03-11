/**
 * Surface
 *
 * A background-surface primitive that maps the design-system's layering tokens
 * (`bgBase` → `bgCard` → `bgElevated`) to a `View` container.
 *
 * Colours respond to the active colour mode via `useTheme()` tokens.
 *
 * | variant     | Background token | Border accent          |
 * |-------------|-----------------|------------------------|
 * | `default`   | `bgBase`         | —                      |
 * | `card`      | `bgCard`         | —                      |
 * | `elevated`  | `bgElevated`     | —                      |
 * | `push`      | `bgElevated`     | `accent` (left, 2px)   |
 * | `pull`      | `bgElevated`     | `secondary` (left, 2px)|
 * | `rest`      | `bgElevated`     | `textMuted` (left, 2px, 50% opacity) |
 *
 * Props:
 * - `variant`   — surface level / semantic role
 * - `children`  — content rendered inside the surface
 * - `className` — additional NativeWind overrides (layout only)
 * - `style`     — escape-hatch inline styles
 *
 * @example
 * ```tsx
 * <Surface variant="card">
 *   <Text>Card content</Text>
 * </Surface>
 * ```
 */

import React from 'react';
import { View } from 'react-native';
import type { ViewProps } from 'react-native';

import type { ThemeTokens } from '@core/theme';
import { useTheme } from '@core/theme/theme-context';

export type SurfaceVariant =
  | 'default'
  | 'card'
  | 'elevated'
  | 'push'
  | 'pull'
  | 'rest';

export interface SurfaceProps extends Pick<ViewProps, 'style'> {
  variant?: SurfaceVariant;
  children?: React.ReactNode;
  className?: string;
}

type SurfaceStyleMap = Record<
  SurfaceVariant,
  {
    container: object;
    /** NativeWind classes for layout-only concerns (border-width, opacity). */
    layoutClass: string;
  }
>;

function buildVariantMap(tokens: ThemeTokens): SurfaceStyleMap {
  return {
    default: { container: { backgroundColor: tokens.bgBase }, layoutClass: '' },
    card: { container: { backgroundColor: tokens.bgCard }, layoutClass: '' },
    elevated: {
      container: { backgroundColor: tokens.bgElevated },
      layoutClass: '',
    },
    push: {
      container: {
        backgroundColor: tokens.bgElevated,
        borderLeftWidth: 2,
        borderLeftColor: tokens.accent,
      },
      layoutClass: '',
    },
    pull: {
      container: {
        backgroundColor: tokens.bgElevated,
        borderLeftWidth: 2,
        borderLeftColor: tokens.secondary,
      },
      layoutClass: '',
    },
    rest: {
      container: {
        backgroundColor: tokens.bgElevated,
        borderLeftWidth: 2,
        borderLeftColor: tokens.textMuted,
        opacity: 0.5,
      },
      layoutClass: '',
    },
  };
}

export function Surface({
  variant = 'default',
  children,
  className = '',
  style,
}: SurfaceProps): React.JSX.Element {
  const { tokens } = useTheme();
  const { container, layoutClass } = buildVariantMap(tokens)[variant];

  return (
    <View
      className={`${layoutClass} ${className}`}
      style={[container, style]}
      accessibilityRole="none"
    >
      {children}
    </View>
  );
}
