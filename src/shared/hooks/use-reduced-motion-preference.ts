/**
 * Calling spec
 *
 * use when:
 * - a shared or feature UI component needs to honor the platform reduce-motion setting
 * - press feedback or layout animation should be gated by accessibility preferences
 *
 * does:
 * - reads the initial reduce-motion preference from `AccessibilityInfo`
 * - subscribes to future `reduceMotionChanged` updates
 * - returns a boolean flag that components can use synchronously
 *
 * does not:
 * - persist any preference
 * - provide animation primitives directly
 */

import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

export function useReducedMotionPreference(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    let isMounted = true;

    AccessibilityInfo.isReduceMotionEnabled()
      .then((isEnabled) => {
        if (isMounted) {
          setPrefersReducedMotion(isEnabled);
        }
      })
      .catch(() => {
        if (isMounted) {
          setPrefersReducedMotion(false);
        }
      });

    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      (isEnabled) => {
        setPrefersReducedMotion(isEnabled);
      },
    );

    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, []);

  return prefersReducedMotion;
}
