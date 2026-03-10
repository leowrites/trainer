/**
 * StatRow
 *
 * Displays a single metric with a large value, optional unit, and optional
 * sub-label.  Mirrors the `.stat-value` / `.stat-unit` / `.stat-sub` CSS
 * pattern from the design spec.
 *
 * Props:
 * - `value`   — the primary numeric or text value to display (e.g. `"142"`)
 * - `unit`    — small unit label appended next to the value (e.g. `"kg"`)
 * - `label`   — uppercase card-label shown above the stat
 * - `sub`     — muted sub-label shown below the value (e.g. `"+5 kg since last week"`)
 * - `className` — NativeWind overrides on the root View
 *
 * Accessibility: the root View has `accessibilityRole="none"`;
 * the value Text carries an `accessibilityLabel` that concatenates value + unit
 * for screen-reader friendliness.
 *
 * @example
 * ```tsx
 * <StatRow
 *   label="Total Volume"
 *   value="4 820"
 *   unit="kg"
 *   sub="+12% vs last week"
 * />
 * ```
 */

import React from 'react';
import { Text, View } from 'react-native';

export interface StatRowProps {
  value: string | number;
  unit?: string;
  label?: string;
  sub?: string;
  className?: string;
}

export function StatRow({
  value,
  unit,
  label,
  sub,
  className = '',
}: StatRowProps): React.JSX.Element {
  const valueStr = String(value);
  const a11yLabel =
    unit !== undefined && unit !== '' ? `${valueStr} ${unit}` : valueStr;

  return (
    <View className={`${className}`} accessibilityRole="none">
      {label !== undefined && label !== '' ? (
        <View className="flex-row items-center mb-3">
          <Text className="text-[10px] uppercase tracking-widest text-muted">
            {label}
          </Text>
          <View className="flex-1 h-px bg-surface-border ml-2" />
        </View>
      ) : null}

      <View className="flex-row items-baseline gap-1">
        <Text
          className="text-[42px] font-bold leading-none text-[#e8e8e8]"
          accessibilityLabel={a11yLabel}
          accessibilityRole="text"
        >
          {valueStr}
        </Text>
        {unit !== undefined && unit !== '' ? (
          <Text
            className="text-sm text-muted"
            accessibilityRole="text"
            accessible={false}
          >
            {unit}
          </Text>
        ) : null}
      </View>

      {sub !== undefined && sub !== '' ? (
        <Text className="text-[11px] text-muted mt-1" accessibilityRole="text">
          {sub}
        </Text>
      ) : null}
    </View>
  );
}
