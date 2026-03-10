/**
 * Grid
 *
 * A flexible 12-column grid system built on React Native's `flexWrap`.
 *
 * Usage:
 * ```tsx
 * <Grid>
 *   <GridItem span={6}>
 *     <Card label="Volume">…</Card>
 *   </GridItem>
 *   <GridItem span={6}>
 *     <Card label="Intensity">…</Card>
 *   </GridItem>
 * </Grid>
 * ```
 *
 * Props — Grid:
 * - `columns`   — total grid columns (default 12)
 * - `gap`       — gap between cells in dp (default 12)
 * - `className` — NativeWind overrides on the outer View
 *
 * Props — GridItem:
 * - `span`      — how many columns this cell spans (1–12, default 12)
 * - `className` — NativeWind overrides on the cell View
 */

import React from 'react';
import { View } from 'react-native';
import type { ViewProps } from 'react-native';

// ─── Grid ─────────────────────────────────────────────────────────────────────

export interface GridProps extends Pick<ViewProps, 'style'> {
  children: React.ReactNode;
  /** Total number of columns the grid is divided into. Default: 12 */
  columns?: number;
  /** Gap between grid cells in dp. Default: 12 */
  gap?: number;
  className?: string;
}

export function Grid({
  children,
  columns = 12,
  gap = 12,
  className = '',
  style,
}: GridProps): React.JSX.Element {
  return (
    <View
      className={`flex-row flex-wrap ${className}`}
      style={[{ gap, margin: -(gap / 2) }, style]}
      accessibilityRole="none"
      // Provide columns via context so GridItem can consume it
    >
      {/* Inject columns count as a context value */}
      <GridContext.Provider value={{ columns, gap }}>
        {children}
      </GridContext.Provider>
    </View>
  );
}

// ─── GridItem ─────────────────────────────────────────────────────────────────

export type ColSpan = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

export interface GridItemProps extends Pick<ViewProps, 'style'> {
  /**
   * Number of grid columns this item occupies.
   * Defaults to the full grid width (equivalent to `col-12`).
   */
  span?: ColSpan;
  children: React.ReactNode;
  className?: string;
}

const GridContext = React.createContext<{ columns: number; gap: number }>({
  columns: 12,
  gap: 12,
});

export function GridItem({
  span = 12,
  children,
  className = '',
  style,
}: GridItemProps): React.JSX.Element {
  const { columns, gap } = React.useContext(GridContext);
  const flexBasis = `${(span / columns) * 100}%` as const;

  return (
    <View
      className={`${className}`}
      style={[{ flexBasis, padding: gap / 2, maxWidth: flexBasis }, style]}
      accessibilityRole="none"
    >
      {children}
    </View>
  );
}
