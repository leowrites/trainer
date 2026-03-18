/**
 * Input
 *
 * A theme-aware text input primitive that wraps React Native's `TextInput`
 * with consistent styling and accessibility support.
 *
 * Props:
 * - `value`            — current text value
 * - `onChangeText`     — change handler
 * - `placeholder`      — placeholder text (rendered in muted colour)
 * - `autoCapitalize`   — capitalisation behaviour (default `sentences`)
 * - `autoCorrect`      — autocorrect toggle (default `true`)
 * - `keyboardType`     — keyboard type (default `default`)
 * - `secureTextEntry`  — hide text for passwords
 * - `returnKeyType`    — return key label
 * - `onSubmitEditing`  — fired when the user taps the return key
 * - `multiline`        — allow multiple lines of text
 * - `numberOfLines`    — initial height hint when `multiline` is true
 * - `editable`         — controls whether the input can be edited
 * - `className`        — additional NativeWind class overrides
 * - `accessibilityLabel` — screen-reader label override
 *
 * @example
 * ```tsx
 * <Input
 *   placeholder="Exercise name"
 *   value={name}
 *   onChangeText={setName}
 * />
 * ```
 */

import React from 'react';
import { TextInput } from 'react-native';
import type { TextInputProps } from 'react-native';

import { useTheme } from '@core/theme/theme-context';

export interface InputProps extends Pick<
  TextInputProps,
  | 'value'
  | 'onChangeText'
  | 'placeholder'
  | 'autoCapitalize'
  | 'autoCorrect'
  | 'keyboardType'
  | 'secureTextEntry'
  | 'returnKeyType'
  | 'onSubmitEditing'
  | 'onEndEditing'
  | 'multiline'
  | 'numberOfLines'
  | 'editable'
  | 'accessibilityLabel'
  | 'testID'
> {
  className?: string;
}

export function Input({
  className = '',
  ...props
}: InputProps): React.JSX.Element {
  const { tokens } = useTheme();

  return (
    <TextInput
      className={`rounded-[18px] px-4 py-3.5 text-sm font-mono ${className}`}
      style={{
        backgroundColor: tokens.bgElevated,
        color: tokens.textPrimary,
        borderWidth: 1,
        borderColor: tokens.bgBorder,
      }}
      placeholderTextColor={tokens.textMuted}
      {...props}
    />
  );
}
