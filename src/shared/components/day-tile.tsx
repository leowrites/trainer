/**
 * Calling spec
 *
 * use when:
 * - a screen needs a compact two-line day/status tile
 * - the tile should render one of the app's semantic day states
 *
 * does:
 * - renders a reusable day tile with primary and secondary labels
 * - maps semantic tones to theme-aware colors and optional outline styling
 * - supports both static and pressable rendering
 *
 * does not:
 * - calculate dates, weeks, or selection state
 * - manage list layout or spacing between tiles
 */

import React from 'react';
import { Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@core/theme/theme-context';
import { InteractivePressable } from './interactive-pressable';

export type DayTileTone = 'default' | 'accent' | 'subtle';

export interface DayTileProps {
  primaryLabel: string;
  secondaryLabel: string;
  tone?: DayTileTone;
  outlined?: boolean;
  accessibilityLabel?: string;
  className?: string;
  onPress?: () => void;
  disabled?: boolean;
}

interface DayTileColors {
  backgroundColor: string;
  borderColor: string;
  borderWidth: number;
  primaryTextColor: string;
  secondaryTextColor: string;
}

function resolveDayTileColors(
  tone: DayTileTone,
  outlined: boolean,
  tokens: ReturnType<typeof useTheme>['tokens'],
): DayTileColors {
  if (tone === 'accent') {
    return {
      backgroundColor: tokens.accent,
      borderColor: 'transparent',
      borderWidth: 0,
      primaryTextColor: tokens.accentForeground,
      secondaryTextColor: tokens.accentForeground,
    };
  }

  if (tone === 'subtle') {
    return {
      backgroundColor: outlined ? tokens.bgElevated : 'transparent',
      borderColor: outlined ? tokens.bgBorder : 'transparent',
      borderWidth: outlined ? 1 : 0,
      primaryTextColor: tokens.textMuted,
      secondaryTextColor: tokens.textPrimary,
    };
  }

  return {
    backgroundColor: 'transparent',
    borderColor: outlined ? tokens.bgBorder : 'transparent',
    borderWidth: outlined ? 1 : 0,
    primaryTextColor: tokens.textMuted,
    secondaryTextColor: tokens.textPrimary,
  };
}

export function DayTile({
  primaryLabel,
  secondaryLabel,
  tone = 'default',
  outlined = false,
  accessibilityLabel,
  className = '',
  onPress,
  disabled = false,
}: DayTileProps): React.JSX.Element {
  const { tokens } = useTheme();
  const colors = resolveDayTileColors(tone, outlined, tokens);
  const containerClassName =
    `items-center rounded-[12px] px-1 py-2 ${className}`.trim();
  const containerStyle: StyleProp<ViewStyle> = {
    backgroundColor: colors.backgroundColor,
    borderColor: colors.borderColor,
    borderWidth: colors.borderWidth,
  };

  const content = (
    <>
      <Text
        className="font-body text-2xs"
        style={{ color: colors.primaryTextColor }}
      >
        {primaryLabel}
      </Text>
      <Text
        className="mt-1 font-heading text-base"
        style={{ color: colors.secondaryTextColor }}
      >
        {secondaryLabel}
      </Text>
    </>
  );

  if (onPress) {
    return (
      <InteractivePressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        className={containerClassName}
        disabled={disabled}
        onPress={onPress}
        style={containerStyle}
      >
        {content}
      </InteractivePressable>
    );
  }

  return (
    <View
      accessibilityRole="none"
      accessibilityLabel={accessibilityLabel}
      className={containerClassName}
      style={containerStyle}
    >
      {content}
    </View>
  );
}
