/**
 * Focused hero value zone.
 *
 * CALLING SPEC:
 * - render one weight or reps zone inside the focused workout hero
 * - shows a stable vertical wheel with one strongly focused current value
 * - treat wheel motion as visual-only and commit settled values upstream
 * - has no persistence side effects on its own
 */

import WheelPicker from '@quidone/react-native-wheel-picker';
import React, { useMemo } from 'react';
import { Text, View } from 'react-native';

import { useTheme } from '@core/theme/theme-context';
import type { HeroValueField } from './focused-set-hero-helpers';
import { formatHeroValue } from './focused-set-hero-helpers';

interface HeroValueZoneProps {
  field: HeroValueField;
  value: number;
  options: number[];
  onCommitValue: (value: number) => void;
  children?: React.ReactNode;
}

function buildWheelData(
  field: HeroValueField,
  options: number[],
): Array<{ value: number; label: string }> {
  return options.map((value) => ({
    value,
    label: formatHeroValue(field, value),
  }));
}

export function HeroValueZone({
  field,
  value,
  options,
  onCommitValue,
  children,
}: HeroValueZoneProps): React.JSX.Element {
  const { tokens } = useTheme();

  const wheelData = useMemo(
    () => buildWheelData(field, options),
    [field, options],
  );

  return (
    <View testID={`hero-zone-${field}`} className="flex-1 rounded-[24px] py-4">
      <WheelPicker
        testID={`hero-zone-${field}-wheel`}
        data={wheelData}
        value={value}
        itemHeight={54}
        visibleItemCount={3}
        width="100%"
        enableScrollByTapOnItem
        onValueChanged={({ item }) => {
          onCommitValue(item.value);
        }}
        itemTextStyle={{
          color: tokens.textMuted,
          fontSize: 16,
        }}
        renderItem={({ item }) => {
          return (
            <View
              testID={
                item.value === value
                  ? `hero-zone-${field}-option-current`
                  : undefined
              }
              className="h-full items-center justify-center"
            >
              <Text
                style={{
                  color: tokens.textPrimary,
                  fontSize: 40,
                  fontWeight: '700',
                }}
              >
                {item.label}
              </Text>
            </View>
          );
        }}
      />
      {children}
    </View>
  );
}
