/**
 * Manual Jest mock for @callstack/liquid-glass.
 *
 * The real package provides a native TurboModule that is not available in the
 * test environment (or Expo Go). This stub mirrors the JS fallback that the
 * library ships for non-iOS-26 environments:
 *
 * - `isLiquidGlassSupported` → false  (native module not present)
 * - `LiquidGlassView`        → View   (no-op passthrough)
 * - `LiquidGlassContainerView` → View (no-op passthrough)
 */

const { View } = require('react-native');

const isLiquidGlassSupported = false;

const LiquidGlassView = View;

const LiquidGlassContainerView = View;

module.exports = {
  isLiquidGlassSupported,
  LiquidGlassView,
  LiquidGlassContainerView,
};
