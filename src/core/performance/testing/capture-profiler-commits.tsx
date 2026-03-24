/**
 * React profiler capture helper.
 *
 * CALLING SPEC:
 * - Wrap a subtree with `buildProfilerHarness` to capture commit counts and
 *   per-commit duration metrics in tests.
 * - Returns imperative readers so tests can assert commit contracts.
 * - Side effects: records in-memory commit metadata only.
 */

import React from 'react';

export interface ProfilerCommit {
  phase: 'mount' | 'update' | 'nested-update';
  actualDuration: number;
  baseDuration: number;
}

export interface ProfilerCapture {
  Harness: React.FC<React.PropsWithChildren>;
  reset: () => void;
  commits: () => ProfilerCommit[];
}

export function buildProfilerCapture(id: string): ProfilerCapture {
  const capturedCommits: ProfilerCommit[] = [];

  const Harness: React.FC<React.PropsWithChildren> = ({ children }) => {
    return (
      <React.Profiler
        id={id}
        onRender={(_id, phase, actualDuration, baseDuration) => {
          capturedCommits.push({
            phase,
            actualDuration,
            baseDuration,
          });
        }}
      >
        {children}
      </React.Profiler>
    );
  };

  return {
    Harness,
    reset: () => {
      capturedCommits.length = 0;
    },
    commits: () => [...capturedCommits],
  };
}
