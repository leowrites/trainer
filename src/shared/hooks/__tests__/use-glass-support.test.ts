/**
 * Tests for useGlassSupport hook.
 *
 * We test the capability flags returned for iOS and Android/Web by mocking
 * `react-native`'s `Platform` module.
 */

import { renderHook } from '@testing-library/react-native';
import { Platform } from 'react-native';

import { useGlassSupport } from '../use-glass-support';

// Helper to set Platform.OS and Platform.Version for a test.
function setPlatform(os: typeof Platform.OS, version: number | string): void {
  Object.defineProperty(Platform, 'OS', { value: os, configurable: true });
  Object.defineProperty(Platform, 'Version', {
    value: version,
    configurable: true,
  });
}

// ─── iOS scenarios ────────────────────────────────────────────────────────────

describe('useGlassSupport — iOS', () => {
  it('returns isSupported=true on iOS', () => {
    setPlatform('ios', 17);

    const { result } = renderHook(() => useGlassSupport());
    expect(result.current.isSupported).toBe(true);
  });

  it('returns isLiquidGlass=false on iOS < 26', () => {
    setPlatform('ios', 18);

    const { result } = renderHook(() => useGlassSupport());
    expect(result.current.isLiquidGlass).toBe(false);
  });

  it('returns isLiquidGlass=true on iOS 26', () => {
    setPlatform('ios', 26);

    const { result } = renderHook(() => useGlassSupport());
    expect(result.current.isLiquidGlass).toBe(true);
  });

  it('returns isLiquidGlass=true on iOS > 26', () => {
    setPlatform('ios', 27);

    const { result } = renderHook(() => useGlassSupport());
    expect(result.current.isLiquidGlass).toBe(true);
  });
});

// ─── Android / Web scenarios ──────────────────────────────────────────────────

describe('useGlassSupport — Android', () => {
  it('returns isSupported=false on Android', () => {
    setPlatform('android', '34');

    const { result } = renderHook(() => useGlassSupport());
    expect(result.current.isSupported).toBe(false);
  });

  it('returns isLiquidGlass=false on Android', () => {
    setPlatform('android', '34');

    const { result } = renderHook(() => useGlassSupport());
    expect(result.current.isLiquidGlass).toBe(false);
  });
});
