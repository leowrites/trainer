/**
 * Apple Health native module wrapper.
 *
 * CALLING SPEC:
 *   isHealthKitAvailable() -> Promise<boolean>
 *   getAuthorizationSnapshot() -> Promise<AppleHealthAuthorizationSnapshot>
 *   requestReadAuthorization() -> Promise<AppleHealthAuthorizationSnapshot>
 *   fetchHealthData(options) -> Promise<AppleHealthFetchResult>
 *
 * Inputs:
 *   - Apple Health import requests from the feature layer.
 * Outputs:
 *   - Feature-normalized authorization and import payloads.
 * Side effects:
 *   - Calls the shared iOS HealthKit bridge on native iOS builds.
 */
import { trainerHealthKit } from '@shared/native/healthkit';

import {
  coerceAppleHealthAuthorizationStatus,
  type AppleHealthAuthorizationSnapshot,
  type AppleHealthFetchOptions,
  type AppleHealthFetchResult,
} from '../domain/apple-health';

function mapAuthorizationStatus(status: string): string {
  if (status === 'sharing_authorized') {
    return 'authorized';
  }

  if (status === 'sharing_denied' || status === 'sharing_restricted') {
    return 'denied';
  }

  return status;
}

function formatDayKey(timestamp: number): string {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export async function isHealthKitAvailable(): Promise<boolean> {
  return trainerHealthKit.isHealthKitAvailable();
}

export async function getAuthorizationSnapshot(): Promise<AppleHealthAuthorizationSnapshot> {
  const snapshot = await trainerHealthKit.getAuthorizationSnapshot();

  return {
    bodyWeight: coerceAppleHealthAuthorizationStatus(
      mapAuthorizationStatus(snapshot.bodyWeightReadStatus),
    ),
    steps: coerceAppleHealthAuthorizationStatus(
      mapAuthorizationStatus(snapshot.stepCountReadStatus),
    ),
  };
}

export async function requestReadAuthorization(): Promise<AppleHealthAuthorizationSnapshot> {
  const snapshot = await trainerHealthKit.requestReadAuthorization();

  return {
    bodyWeight: coerceAppleHealthAuthorizationStatus(
      mapAuthorizationStatus(snapshot.bodyWeightReadStatus),
    ),
    steps: coerceAppleHealthAuthorizationStatus(
      mapAuthorizationStatus(snapshot.stepCountReadStatus),
    ),
  };
}

export async function fetchHealthData(
  options: AppleHealthFetchOptions,
): Promise<AppleHealthFetchResult> {
  const payload = await trainerHealthKit.fetchHealthData(options);

  return {
    bodyWeightSamples: payload.bodyWeightSamples.map((sample) => ({
      uuid: sample.uuid,
      value: sample.weight,
      unit: 'kg',
      loggedAt: sample.startTimestamp,
      sourceApp: sample.sourceName,
    })),
    stepSummaries: payload.stepDailyTotals.map((summary) => ({
      dayKey: formatDayKey(summary.dayStartTimestamp),
      stepCount: summary.stepCount,
      sourceRecordId: formatDayKey(summary.dayStartTimestamp),
    })),
  };
}
