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

import { useTheme } from '@core/theme/theme-context';
import { Box } from '@shared/ui/box';
import { Text } from '@shared/ui/text';

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
  const { tokens } = useTheme();
  const valueStr = String(value);
  const a11yLabel =
    unit !== undefined && unit !== '' ? `${valueStr} ${unit}` : valueStr;

  return (
    <Box className={`${className}`} accessibilityRole="none">
      {label !== undefined && label !== '' ? (
        <Box className="flex-row items-center mb-3">
          <Text
            className="font-mono text-2xs uppercase tracking-[2.2px]"
            style={{ color: tokens.textMuted }}
          >
            {label}
          </Text>
          <Box
            className="flex-1 h-px ml-2"
            style={{ backgroundColor: tokens.bgBorder }}
          />
        </Box>
      ) : null}

      <Box className="flex-row items-baseline gap-1">
        <Text
          className="font-heading text-4xl font-bold leading-none tracking-tight"
          style={{ color: tokens.textPrimary }}
          accessibilityLabel={a11yLabel}
          accessibilityRole="text"
        >
          {valueStr}
        </Text>
        {unit !== undefined && unit !== '' ? (
          <Text
            className="font-mono text-sm uppercase tracking-[1.2px]"
            style={{ color: tokens.textMutedForeground }}
            accessibilityRole="text"
            accessible={false}
          >
            {unit}
          </Text>
        ) : null}
      </Box>

      {sub !== undefined && sub !== '' ? (
        <Text
          className="mt-1 font-body text-xs leading-[16px]"
          style={{ color: tokens.textMutedForeground }}
          accessibilityRole="text"
        >
          {sub}
        </Text>
      ) : null}
    </Box>
  );
}
