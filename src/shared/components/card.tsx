/**
 * Calling spec
 *
 * use when:
 * - a feature needs the shared bordered surface card treatment
 * - the card may optionally expose a full-surface press target
 *
 * does:
 * - renders the app's default card container styling
 * - optionally adds the shared label strip above the content
 * - delegates press feedback to `InteractivePressable`
 *
 * does not:
 * - manage feature-specific layout beyond the label strip
 * - replace nested controls inside the card body
 */

import React from 'react';
import type { ViewProps } from 'react-native';

import { Box } from '@shared/ui/box';
import { Card as GluestackCard } from '@shared/ui/card';
import { InteractivePressable } from './interactive-pressable';
import { Label } from './typography';

export interface CardProps extends Pick<ViewProps, 'style'> {
  label?: string;
  children: React.ReactNode;
  className?: string;
  /** Makes the card interactive. */
  onPress?: () => void;
  accessibilityLabel?: string;
}

export function Card({
  label,
  children,
  className = '',
  style,
  onPress,
  accessibilityLabel,
}: CardProps): React.JSX.Element {
  const hasLabel = label !== undefined && label !== '';

  const renderContent = (): React.JSX.Element => (
    <Box>
      {hasLabel ? (
        <Box className="mb-5 flex-row items-center">
          <Box className="mr-2">
            <Label className="text-muted-foreground">{label}</Label>
          </Box>
          <Box className="h-px flex-1 bg-surface-border/70" />
        </Box>
      ) : null}
      {children}
    </Box>
  );

  const renderCardSurface = (pressed: boolean): React.JSX.Element => (
    <GluestackCard
      className={`overflow-hidden rounded-[24px] border px-5 py-5 ${
        pressed
          ? 'border-surface-border bg-surface-elevated'
          : 'border-surface-border bg-surface-card'
      } ${className}`}
      style={style}
    >
      {renderContent()}
    </GluestackCard>
  );

  if (onPress) {
    return (
      <InteractivePressable
        onPress={onPress}
        pressedScale={0.98}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
      >
        {({ pressed }) => renderCardSurface(pressed)}
      </InteractivePressable>
    );
  }

  return <Box accessibilityRole="none">{renderCardSurface(false)}</Box>;
}
