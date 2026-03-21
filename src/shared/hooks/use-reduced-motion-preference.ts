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

import { useSyncExternalStore } from 'react';
import { AccessibilityInfo } from 'react-native';

type ReduceMotionListener = () => void;

let prefersReducedMotionSnapshot = false;
let hasLoadedInitialPreference = false;
let isLoadingInitialPreference = false;
let hasRegisteredChangeListener = false;
let nativeSubscription: { remove: () => void } | undefined;
let initialLoadToken = 0;

const listeners = new Set<ReduceMotionListener>();

function notifyListeners(): void {
  listeners.forEach((listener) => {
    listener();
  });
}

function updateReducedMotionPreference(isEnabled: boolean): void {
  prefersReducedMotionSnapshot = isEnabled;
  hasLoadedInitialPreference = true;
  notifyListeners();
}

function loadInitialPreference(): void {
  if (hasLoadedInitialPreference || isLoadingInitialPreference) {
    return;
  }

  isLoadingInitialPreference = true;
  const loadToken = initialLoadToken + 1;
  initialLoadToken = loadToken;

  AccessibilityInfo.isReduceMotionEnabled()
    .then((isEnabled) => {
      if (loadToken !== initialLoadToken) {
        return;
      }

      updateReducedMotionPreference(isEnabled);
    })
    .catch(() => {
      if (loadToken !== initialLoadToken) {
        return;
      }

      updateReducedMotionPreference(false);
    })
    .finally(() => {
      if (loadToken === initialLoadToken) {
        isLoadingInitialPreference = false;
      }
    });
}

function ensureReducedMotionSubscription(): void {
  loadInitialPreference();

  if (hasRegisteredChangeListener) {
    return;
  }

  nativeSubscription =
    AccessibilityInfo.addEventListener('reduceMotionChanged', (isEnabled) => {
      updateReducedMotionPreference(isEnabled);
    }) ?? undefined;
  hasRegisteredChangeListener = true;
}

function teardownReducedMotionSubscription(): void {
  if (listeners.size > 0) {
    return;
  }

  nativeSubscription?.remove();
  nativeSubscription = undefined;
  hasRegisteredChangeListener = false;
  hasLoadedInitialPreference = false;
  isLoadingInitialPreference = false;
  initialLoadToken += 1;
}

function subscribeToReducedMotion(listener: ReduceMotionListener): () => void {
  ensureReducedMotionSubscription();
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
    teardownReducedMotionSubscription();
  };
}

function getReducedMotionSnapshot(): boolean {
  return prefersReducedMotionSnapshot;
}

export function useReducedMotionPreference(): boolean {
  return useSyncExternalStore(
    subscribeToReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionSnapshot,
  );
}
