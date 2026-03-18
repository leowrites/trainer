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
import type { ViewProps } from 'react-native';
import type { Edge } from 'react-native-safe-area-context';

import { SafeAreaView } from '@shared/ui/safe-area-view';

export interface ContainerProps extends Pick<ViewProps, 'style'> {
  children: React.ReactNode;
  /**
   * Additional NativeWind utility classes appended after the defaults.
   * Use this to override padding, background, flex direction, etc.
   */
  className?: string;
  edges?: Edge[];
}

export function Container({
  children,
  className = '',
  edges,
  style,
}: ContainerProps): React.JSX.Element {
  return (
    <SafeAreaView
      edges={edges}
      className={`flex-1 w-full bg-surface px-5 pb-8 web:self-center web:max-w-5xl ${className}`}
      style={style}
      accessibilityRole="none"
    >
      {children}
    </SafeAreaView>
  );
}
