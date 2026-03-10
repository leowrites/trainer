/**
 * Surface
 *
 * A background-surface primitive that maps the design-system's layering tokens
 * (`bgBase` → `bgCard` → `bgElevated`) to a `View` container.
 *
 * | variant     | Tailwind class     | Hex      |
 * |-------------|-------------------|----------|
 * | `default`   | `bg-surface`       | #0e0e0e  |
 * | `card`      | `bg-surface-card`  | #161616  |
 * | `elevated`  | `bg-surface-elevated` | #1e1e1e |
 * | `push`      | accent left border | #1e1e1e  |
 * | `pull`      | secondary left border | #1e1e1e |
 * | `rest`      | muted / dimmed     | #1e1e1e  |
 *
 * Props:
 * - `variant`   — surface level / semantic role
 * - `children`  — content rendered inside the surface
 * - `className` — additional NativeWind overrides
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

const variantClasses: Record<SurfaceVariant, string> = {
  default: 'bg-surface',
  card: 'bg-surface-card',
  elevated: 'bg-surface-elevated',
  push: 'bg-surface-elevated border-l-2 border-l-accent',
  pull: 'bg-surface-elevated border-l-2 border-l-secondary',
  rest: 'bg-surface-elevated border-l-2 border-l-muted opacity-50',
};

export function Surface({
  variant = 'default',
  children,
  className = '',
  style,
}: SurfaceProps): React.JSX.Element {
  return (
    <View
      className={`${variantClasses[variant]} ${className}`}
      style={style}
      accessibilityRole="none"
    >
      {children}
    </View>
  );
}
