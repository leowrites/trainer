/**
 * Perf baseline updater.
 *
 * CALLING SPEC:
 * - Copies current nightly metrics into the committed baseline file.
 * - Use after intentional performance changes that should redefine baseline.
 * - Side effects: writes `perf/baselines/ios-simulator-baseline.json`.
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT_DIR = process.cwd();
const CURRENT_METRICS_PATH = path.join(
  ROOT_DIR,
  'perf',
  'artifacts',
  'nightly',
  'ios-current-metrics.json',
);
const BASELINE_PATH = path.join(
  ROOT_DIR,
  'perf',
  'baselines',
  'ios-simulator-baseline.json',
);

function ensureBaselineDirectory() {
  fs.mkdirSync(path.dirname(BASELINE_PATH), { recursive: true });
}

function main() {
  if (!fs.existsSync(CURRENT_METRICS_PATH)) {
    throw new Error(
      `Current metrics file not found at ${CURRENT_METRICS_PATH}. Run npm run perf:ios:nightly first.`,
    );
  }

  const currentMetrics = JSON.parse(
    fs.readFileSync(CURRENT_METRICS_PATH, 'utf8'),
  );
  const nextBaseline = {
    ...currentMetrics,
    generatedAt: new Date().toISOString(),
  };

  ensureBaselineDirectory();
  fs.writeFileSync(
    BASELINE_PATH,
    `${JSON.stringify(nextBaseline, null, 2)}\n`,
    'utf8',
  );

  console.log(`Updated perf baseline: ${BASELINE_PATH}`);
}

main();
