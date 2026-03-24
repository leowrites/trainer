/**
 * Render counter helper.
 *
 * CALLING SPEC:
 * - Use `buildRenderCounter()` in tests to track render counts for specific
 *   subtrees and assert re-render isolation contracts.
 * - Wrap target subtree with `Counter` and provide a logical `name`.
 * - Side effects: tracks render counts in-memory only.
 */

import React from 'react';

export interface RenderCounterHandle {
  Counter: React.FC<React.PropsWithChildren<{ name: string }>>;
  countFor: (name: string) => number;
  snapshot: () => Record<string, number>;
  reset: () => void;
}

export function buildRenderCounter(): RenderCounterHandle {
  const counts = new Map<string, number>();

  const Counter: React.FC<React.PropsWithChildren<{ name: string }>> = ({
    name,
    children,
  }) => {
    const nextCount = (counts.get(name) ?? 0) + 1;
    counts.set(name, nextCount);
    return <>{children}</>;
  };

  return {
    Counter,
    countFor: (name) => counts.get(name) ?? 0,
    snapshot: () => Object.fromEntries(counts.entries()),
    reset: () => {
      counts.clear();
    },
  };
}
