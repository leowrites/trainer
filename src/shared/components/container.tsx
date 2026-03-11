/**
 * Container
 *
 * A full-screen wrapper that centres content, enforces consistent horizontal
 * padding, and optionally applies safe-area insets.
 *
 * Props:
 * - `children`   — required content
 * - `className`  — additional NativeWind class overrides
 * - `style`      — escape-hatch inline styles
 *
 * Accessibility: `role="none"` (pure layout, no semantic meaning).
 *
 * @example
 * ```tsx
 * <Container>
 *   <Text>Hello</Text>
 * </Container>
 * ```
 */

import React from 'react';
import { View } from 'react-native';
import type { ViewProps } from 'react-native';

import { useTheme } from '@core/theme/theme-context';

export interface ContainerProps extends Pick<ViewProps, 'style'> {
  children: React.ReactNode;
  /**
   * Additional NativeWind utility classes appended after the defaults.
   * Use this to override padding, background, flex direction, etc.
   */
  className?: string;
}

export function Container({
  children,
  className = '',
  style,
}: ContainerProps): React.JSX.Element {
  const { tokens } = useTheme();
  return (
    <View
      className={`flex-1 px-6 ${className}`}
      style={[{ backgroundColor: tokens.bgBase }, style]}
      accessibilityRole="none"
    >
      {children}
    </View>
  );
}
