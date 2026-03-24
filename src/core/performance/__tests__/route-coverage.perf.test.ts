/**
 * Route coverage perf contract.
 *
 * CALLING SPEC:
 * - Extract route names from registered navigators and ensure each route has a
 *   perf contract entry in `ROUTE_PERF_COVERAGE`.
 * - Fails when new routes are added without perf coverage declarations.
 * - Side effects: reads navigator source files only.
 */

import fs from 'node:fs';
import path from 'node:path';

import {
  EXTRA_FLOW_PERF_COVERAGE,
  ROUTE_PERF_COVERAGE,
} from '@core/performance';

const SCREEN_NAME_PATTERN =
  /<(?:Stack|BottomTab|NativeTab)\.Screen\s+name="([^"]+)"/g;

function readFileFromRepo(relativePath: string): string {
  const rootDir = path.resolve(__dirname, '../../../..');
  const absolutePath = path.join(rootDir, relativePath);
  return fs.readFileSync(absolutePath, 'utf8');
}

function extractRouteNames(source: string): string[] {
  const matches = source.matchAll(SCREEN_NAME_PATTERN);
  return Array.from(matches, (match) => match[1] ?? '').filter(Boolean);
}

function getRegisteredRouteNames(): string[] {
  const routeNames = new Set<string>();
  const navigatorFiles = [
    'src/core/navigation/root-navigator.tsx',
    'src/features/routines/screens/routines-screen.tsx',
    'src/features/analytics/screens/history-navigator.tsx',
  ];

  navigatorFiles.forEach((filePath) => {
    const source = readFileFromRepo(filePath);
    extractRouteNames(source).forEach((routeName) => {
      routeNames.add(routeName);
    });
  });

  return Array.from(routeNames).sort();
}

describe('route perf coverage manifest', () => {
  it('declares coverage for every registered route', () => {
    const registeredRouteNames = getRegisteredRouteNames();
    const coveredRouteNames = new Set(
      ROUTE_PERF_COVERAGE.map((entry) => entry.routeName),
    );

    const uncoveredRoutes = registeredRouteNames.filter(
      (routeName) => !coveredRouteNames.has(routeName),
    );

    expect(uncoveredRoutes).toEqual([]);
  });

  it('does not keep stale route entries that are no longer registered', () => {
    const registeredRouteNames = new Set(getRegisteredRouteNames());
    const staleEntries = ROUTE_PERF_COVERAGE.filter(
      (entry) => !registeredRouteNames.has(entry.routeName),
    );

    expect(staleEntries).toEqual([]);
  });

  it('keeps standalone flow coverage for non-navigator performance paths', () => {
    expect(
      EXTRA_FLOW_PERF_COVERAGE.some(
        (entry) =>
          entry.routeName === 'ScheduleList' &&
          entry.jestContractId === 'schedule-list',
      ),
    ).toBe(true);
  });

  it('keeps route names unique for deterministic ownership', () => {
    const routeNames = ROUTE_PERF_COVERAGE.map((entry) => entry.routeName);
    const uniqueRouteNames = new Set(routeNames);

    expect(uniqueRouteNames.size).toBe(routeNames.length);
  });
});
