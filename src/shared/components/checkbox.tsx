/**
 * Checkbox
 *
 * A theme-aware checkbox row that combines a visual check indicator with a
 * text label (and optional sub-label). Pressing anywhere on the row toggles
 * the checked state.
 *
 * Props:
 * - `checked`           — whether the checkbox is currently selected
 * - `onToggle`          — called when the user taps the row
 * - `label`             — primary label text displayed beside the checkbox
 * - `sublabel`          — optional secondary text below the label
 * - `badgeText`         — optional short text rendered inside the check box
 *                         when `checked` is true (e.g. ordering numbers)
 * - `disabled`          — disables interaction and dims the row
 * - `className`         — additional NativeWind class overrides on the row
 * - `accessibilityLabel` — screen-reader label override
 *
 * @example
 * ```tsx
 * <Checkbox
 *   checked={selected}
 *   onToggle={() => toggle(id)}
 *   label="Push A"
 *   sublabel="6 exercises"
 * />
 * ```
 */

import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { useTheme } from '@core/theme/theme-context';

export interface CheckboxProps {
  checked: boolean;
  onToggle: () => void;
  label: string;
  sublabel?: string;
  /** Short text shown inside the check box when checked (e.g. position index). */
  badgeText?: string;
  disabled?: boolean;
  className?: string;
  accessibilityLabel?: string;
}

export function Checkbox({
  checked,
  onToggle,
  label,
  sublabel,
  badgeText,
  disabled = false,
  className = '',
  accessibilityLabel,
}: CheckboxProps): React.JSX.Element {
  const { tokens } = useTheme();

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
      accessibilityLabel={accessibilityLabel ?? label}
      className={`mb-2 flex-row items-center rounded-[18px] border border-surface-border bg-surface-elevated px-4 py-3 ${className}`}
      onPress={disabled ? undefined : onToggle}
      disabled={disabled}
      style={{ opacity: disabled ? 0.5 : 1 }}
    >
      {/* Check box indicator */}
      <View
        className="mr-3 h-6 w-6 items-center justify-center rounded-[10px]"
        style={{
          borderWidth: 1.5,
          borderColor: checked ? tokens.accent : tokens.bgBorder,
          backgroundColor: checked ? tokens.accent : 'transparent',
        }}
      >
        {checked ? (
          <Text
            className="text-[10px] font-bold"
            style={{ color: tokens.accentForeground }}
          >
            {badgeText ?? '✓'}
          </Text>
        ) : null}
      </View>

      {/* Labels */}
      <View className="flex-1">
        <Text
          className="text-[13px] leading-[18px]"
          style={{ color: tokens.textPrimary }}
        >
          {label}
        </Text>
        {sublabel !== undefined && sublabel !== '' ? (
          <Text
            className="mt-1 font-mono text-[10px] uppercase tracking-[1.5px]"
            style={{ color: tokens.textMuted }}
          >
            {sublabel}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}
