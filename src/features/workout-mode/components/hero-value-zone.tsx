/**
 * Focused hero value zone.
 *
 * CALLING SPEC:
 * - render one weight or reps zone inside the focused workout hero
 * - shows a stable vertical wheel with one strongly focused current value
 * - previews wheel values locally and commits settled values upstream
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
  onPreviewValue: (value: number) => void;
  onCommitValue: (value: number) => void;
}

function buildWheelData(field: HeroValueField, options: number[]) {
  return options.map((value) => ({
    value,
    label: formatHeroValue(field, value),
  }));
}

export function HeroValueZone({
  field,
  value,
  options,
  onPreviewValue,
  onCommitValue,
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
        onValueChanging={({ item }) => {
          onPreviewValue(item.value);
        }}
        onValueChanged={({ item }) => {
          onCommitValue(item.value);
        }}
        itemTextStyle={{
          color: tokens.textMuted,
          fontSize: 16,
        }}
        renderItem={({ item }) => {
          return (
            <View className="h-full items-center justify-center">
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
    </View>
  );
}
