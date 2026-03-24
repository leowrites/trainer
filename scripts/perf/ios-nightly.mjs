/**
 * iOS nightly perf runner.
 *
 * CALLING SPEC:
 * - Boots an iOS simulator (prefers iPhone 16e), runs the debug perf lab,
 *   captures xctrace artifacts, reads latest perf rows from sqlite, and
 *   compares against committed baseline thresholds.
 * - Exits non-zero on regression policy violations.
 * - Side effects: boots simulator, launches app build, writes perf artifacts.
 */

import { execSync, spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT_DIR = process.cwd();
const ARTIFACT_DIR = path.join(ROOT_DIR, 'perf', 'artifacts', 'nightly');
const CURRENT_METRICS_PATH = path.join(
  ARTIFACT_DIR,
  'ios-current-metrics.json',
);
const BASELINE_PATH = path.join(
  ROOT_DIR,
  'perf',
  'baselines',
  'ios-simulator-baseline.json',
);
const TRACE_PATH = path.join(ARTIFACT_DIR, 'ios-time-profiler.trace');
const IOS_BUNDLE_ID = 'com.leoliu.forge.dev';
const IOS_PROCESS_NAME = 'forge';
const IOS_PREFERRED_DEVICE = 'iPhone 16e';
const IOS_FALLBACK_DEVICE_PREFIX = 'iPhone';
const EXPO_DEV_SERVER_PORT = 8081;

const REGRESSION_LIMITS = {
  p50Pct: 15,
  p95Pct: 20,
  longTaskPct: 25,
};

function run(command, options = {}) {
  return execSync(command, {
    cwd: ROOT_DIR,
    stdio: ['ignore', 'pipe', 'pipe'],
    encoding: 'utf8',
    ...options,
  }).trim();
}

function ensureDirectory(directoryPath) {
  fs.mkdirSync(directoryPath, { recursive: true });
}

function resolveSimulator() {
  const raw = run('xcrun simctl list devices available -j');
  const parsed = JSON.parse(raw);
  const allDevices = Object.values(parsed.devices)
    .flat()
    .filter((device) => device.isAvailable);

  const exactMatch = allDevices.find(
    (device) => device.name === IOS_PREFERRED_DEVICE,
  );
  if (exactMatch) {
    return exactMatch;
  }

  const fallback = allDevices.find((device) =>
    String(device.name).startsWith(IOS_FALLBACK_DEVICE_PREFIX),
  );
  if (!fallback) {
    throw new Error('No available iOS simulator device found.');
  }

  return fallback;
}

function bootSimulator(udid) {
  try {
    run(`xcrun simctl boot "${udid}"`);
  } catch {
    // Device may already be booted.
  }

  run('xcrun simctl bootstatus booted -b');
}

function runExpoIos(deviceName) {
  const command =
    'CI=1 PATH=/opt/homebrew/opt/node@22/bin:$PATH EXPO_PUBLIC_PERF_LAB=1 EXPO_PUBLIC_PERF_SCENARIO=default npx expo run:ios --no-bundler -d "' +
    deviceName +
    '"';
  return spawnSync('/bin/zsh', ['-lc', command], {
    cwd: ROOT_DIR,
    stdio: 'inherit',
  });
}

function freeDevServerPort(port) {
  try {
    const pid = run(
      `lsof -nP -iTCP:${port} -sTCP:LISTEN -t | head -n 1 || true`,
    );
    if (!pid) {
      return;
    }

    run(`kill ${pid}`);
  } catch {
    // best-effort cleanup only
  }
}

function startMetroServer() {
  return new Promise((resolve, reject) => {
    const command =
      'CI=1 PATH=/opt/homebrew/opt/node@22/bin:$PATH EXPO_PUBLIC_PERF_LAB=1 EXPO_PUBLIC_PERF_SCENARIO=default npx expo start --dev-client --port ' +
      EXPO_DEV_SERVER_PORT;
    const metroProcess = spawn('/bin/zsh', ['-lc', command], {
      cwd: ROOT_DIR,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let settled = false;
    let outputBuffer = '';
    const readinessMarkers = [
      `http://localhost:${EXPO_DEV_SERVER_PORT}`,
      `http://127.0.0.1:${EXPO_DEV_SERVER_PORT}`,
    ];

    const onData = (chunk) => {
      const text = String(chunk);
      outputBuffer = `${outputBuffer}${text}`;
      if (
        !settled &&
        readinessMarkers.some((marker) => outputBuffer.includes(marker))
      ) {
        settled = true;
        clearTimeout(timeoutId);
        resolve(metroProcess);
      }
    };

    metroProcess.stdout?.on('data', onData);
    metroProcess.stderr?.on('data', onData);

    metroProcess.on('exit', (code) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timeoutId);
      reject(
        new Error(
          `Metro exited before becoming ready (code: ${
            code ?? 'null'
          }). Output: ${outputBuffer.slice(-800)}`,
        ),
      );
    });

    const timeoutId = setTimeout(() => {
      if (settled) {
        return;
      }

      settled = true;
      metroProcess.kill('SIGTERM');
      reject(
        new Error(
          `Timed out waiting for Metro dev server readiness. Output: ${outputBuffer.slice(
            -800,
          )}`,
        ),
      );
    }, 90000);
  });
}

function stopMetroServer(metroProcess) {
  if (!metroProcess || metroProcess.killed) {
    return;
  }

  metroProcess.kill('SIGTERM');
}

function captureTrace(deviceName) {
  const traceCommand = [
    'xcrun',
    'xctrace',
    'record',
    '--template',
    '"Time Profiler"',
    '--device',
    `"${deviceName}"`,
    '--attach',
    `"${IOS_PROCESS_NAME}"`,
    '--time-limit',
    '15s',
    '--output',
    `"${TRACE_PATH}"`,
  ].join(' ');

  try {
    run(traceCommand, { stdio: 'pipe' });
  } catch (error) {
    const message = String(error?.stderr ?? error?.message ?? error);
    throw new Error(`xctrace capture failed: ${message}`);
  }
}

function resolveDatabasePath(udid) {
  const appContainer = run(
    `xcrun simctl get_app_container "${udid}" "${IOS_BUNDLE_ID}" data`,
  );
  const locateCommand = `find "${appContainer}" -name trainer.db | head -n 1`;
  const dbPath = run(locateCommand);

  if (!dbPath) {
    throw new Error(`Could not locate trainer.db under ${appContainer}`);
  }

  return dbPath;
}

function loadLatestPerfRows(dbPath) {
  const sql = [
    'SELECT run_id, scenario_id, timestamp, device, sample_count,',
    'p50_ms, p95_ms, max_ms, main_thread_long_task_count',
    'FROM perf_lab_runs',
    'WHERE run_id = (SELECT run_id FROM perf_lab_runs ORDER BY id DESC LIMIT 1)',
    'ORDER BY scenario_id ASC;',
  ].join(' ');

  const raw = run(`sqlite3 "${dbPath}" -json "${sql}"`);
  const rows = raw ? JSON.parse(raw) : [];

  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error('No perf_lab_runs rows found for latest run.');
  }

  return rows;
}

function buildCurrentMetrics(deviceName, rows) {
  const scenarios = {};

  rows.forEach((row) => {
    scenarios[row.scenario_id] = {
      scenarioId: row.scenario_id,
      timestamp: row.timestamp,
      device: row.device,
      sampleCount: Number(row.sample_count),
      p50Ms: Number(row.p50_ms),
      p95Ms: Number(row.p95_ms),
      maxMs: Number(row.max_ms),
      mainThreadLongTaskCount: Number(row.main_thread_long_task_count),
      metadata: {
        source: 'perf-lab-sqlite',
      },
    };
  });

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    platform: 'ios-simulator',
    device: deviceName,
    scenarios,
  };
}

function regressionPct(currentValue, baselineValue) {
  if (baselineValue === 0) {
    return currentValue > 0 ? 100 : 0;
  }

  return ((currentValue - baselineValue) / baselineValue) * 100;
}

function compareWithBaseline(currentMetrics, baselineMetrics) {
  const violations = [];

  Object.entries(currentMetrics.scenarios).forEach(([scenarioId, current]) => {
    const baseline = baselineMetrics.scenarios?.[scenarioId];
    if (!baseline) {
      violations.push(
        `${scenarioId}: missing from baseline metrics (run perf:baseline:update).`,
      );
      return;
    }

    const p50Regression = regressionPct(current.p50Ms, baseline.p50Ms);
    if (p50Regression > REGRESSION_LIMITS.p50Pct) {
      violations.push(
        `${scenarioId}: p50 regression ${p50Regression.toFixed(
          2,
        )}% > ${REGRESSION_LIMITS.p50Pct}% (baseline ${baseline.p50Ms}, current ${
          current.p50Ms
        }).`,
      );
    }

    const p95Regression = regressionPct(current.p95Ms, baseline.p95Ms);
    if (p95Regression > REGRESSION_LIMITS.p95Pct) {
      violations.push(
        `${scenarioId}: p95 regression ${p95Regression.toFixed(
          2,
        )}% > ${REGRESSION_LIMITS.p95Pct}% (baseline ${baseline.p95Ms}, current ${
          current.p95Ms
        }).`,
      );
    }

    const longTaskRegression = regressionPct(
      current.mainThreadLongTaskCount,
      baseline.mainThreadLongTaskCount,
    );
    if (longTaskRegression > REGRESSION_LIMITS.longTaskPct) {
      violations.push(
        `${scenarioId}: long-task regression ${longTaskRegression.toFixed(
          2,
        )}% > ${REGRESSION_LIMITS.longTaskPct}% (baseline ${
          baseline.mainThreadLongTaskCount
        }, current ${current.mainThreadLongTaskCount}).`,
      );
    }
  });

  return violations;
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function main() {
  ensureDirectory(ARTIFACT_DIR);
  fs.rmSync(TRACE_PATH, { recursive: true, force: true });

  if (!fs.existsSync(BASELINE_PATH)) {
    throw new Error(
      `Missing baseline file: ${BASELINE_PATH}. Run npm run perf:baseline:update after generating current metrics.`,
    );
  }

  const simulator = resolveSimulator();
  bootSimulator(simulator.udid);
  freeDevServerPort(EXPO_DEV_SERVER_PORT);

  let metroProcess = null;

  try {
    metroProcess = await startMetroServer();

    const expoResult = runExpoIos(simulator.name);
    if (expoResult.status !== 0) {
      throw new Error(
        'expo run:ios failed while running nightly perf harness.',
      );
    }

    captureTrace(simulator.name);

    const dbPath = resolveDatabasePath(simulator.udid);
    const latestRows = loadLatestPerfRows(dbPath);
    const currentMetrics = buildCurrentMetrics(simulator.name, latestRows);
    writeJson(CURRENT_METRICS_PATH, currentMetrics);

    const baselineMetrics = JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8'));
    const violations = compareWithBaseline(currentMetrics, baselineMetrics);

    if (violations.length > 0) {
      console.error('Performance regression violations:');
      violations.forEach((violation) => {
        console.error(`- ${violation}`);
      });
      process.exit(1);
    }

    console.log(`Nightly perf completed successfully: ${CURRENT_METRICS_PATH}`);
    console.log(`Trace artifact: ${TRACE_PATH}`);
  } finally {
    stopMetroServer(metroProcess);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
