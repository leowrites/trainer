/**
 * TrainerHealthKit - typed bridge contract for native HealthKit reads on iOS.
 *
 * CALLING SPEC:
 *   import { trainerHealthKit } from '@/shared/native/healthkit';
 *
 *   await trainerHealthKit.isHealthKitAvailable() -> boolean
 *   await trainerHealthKit.getAuthorizationSnapshot() -> AuthorizationSnapshot
 *   await trainerHealthKit.requestReadAuthorization() -> AuthorizationSnapshot
 *   await trainerHealthKit.fetchHealthData({
 *     fromTimestamp: number,
 *     toTimestamp: number,
 *   }) -> {
 *     bodyWeightSamples: BodyWeightSample[];
 *     stepDailyTotals: StepDailyTotal[];
 *   }
 *
 * Inputs:
 *   - Timestamps are Unix milliseconds.
 *   - Payloads are flat JSON-compatible values only.
 * Side effects:
 *   - Calls the native iOS bridge when available.
 *   - Returns a deterministic fallback on non-iOS platforms.
 */

import { NativeModules, Platform } from 'react-native';

export const TRAINER_HEALTHKIT_MODULE_NAME = 'TrainerHealthKit' as const;

export type TrainerHealthKitAccessStatus =
  | 'not_determined'
  | 'sharing_denied'
  | 'sharing_authorized'
  | 'sharing_restricted'
  | 'unavailable';

export interface TrainerHealthKitAuthorizationSnapshot {
  available: boolean;
  bodyWeightReadStatus: TrainerHealthKitAccessStatus;
  stepCountReadStatus: TrainerHealthKitAccessStatus;
}

export interface TrainerHealthKitBodyWeightSample {
  uuid: string;
  weight: number;
  unit: 'kg';
  startTimestamp: number;
  endTimestamp: number;
  sourceBundleIdentifier: string;
  sourceName: string;
  sourceVersion: string | null;
  wasUserEntered: boolean;
}

export interface TrainerHealthKitStepDailyTotal {
  dayStartTimestamp: number;
  stepCount: number;
}

export interface TrainerHealthKitFetchRequest {
  fromTimestamp: number;
  toTimestamp: number;
}

export interface TrainerHealthKitFetchResult {
  bodyWeightSamples: TrainerHealthKitBodyWeightSample[];
  stepDailyTotals: TrainerHealthKitStepDailyTotal[];
}

export interface TrainerHealthKitNativeModule {
  isHealthKitAvailable(): Promise<boolean>;
  getAuthorizationSnapshot(): Promise<TrainerHealthKitAuthorizationSnapshot>;
  requestReadAuthorization(): Promise<TrainerHealthKitAuthorizationSnapshot>;
  fetchHealthData(
    request: TrainerHealthKitFetchRequest,
  ): Promise<TrainerHealthKitFetchResult>;
}

const unavailableSnapshot: TrainerHealthKitAuthorizationSnapshot = {
  available: false,
  bodyWeightReadStatus: 'unavailable',
  stepCountReadStatus: 'unavailable',
};

function createUnavailableError(methodName: string): Error {
  return new Error(
    `trainerHealthKit.${methodName} is only available on iOS native builds.`,
  );
}

function getNativeModule(): Partial<TrainerHealthKitNativeModule> | null {
  const module = NativeModules[
    TRAINER_HEALTHKIT_MODULE_NAME
  ] as Partial<TrainerHealthKitNativeModule> | null;

  if (Platform.OS !== 'ios' || module === null || module === undefined) {
    return null;
  }

  return module;
}

export const trainerHealthKit: TrainerHealthKitNativeModule = {
  async isHealthKitAvailable(): Promise<boolean> {
    const module = getNativeModule();

    if (typeof module?.isHealthKitAvailable !== 'function') {
      return false;
    }

    return module.isHealthKitAvailable();
  },

  async getAuthorizationSnapshot(): Promise<TrainerHealthKitAuthorizationSnapshot> {
    const module = getNativeModule();

    if (typeof module?.getAuthorizationSnapshot !== 'function') {
      return unavailableSnapshot;
    }

    return module.getAuthorizationSnapshot();
  },

  async requestReadAuthorization(): Promise<TrainerHealthKitAuthorizationSnapshot> {
    const module = getNativeModule();

    if (typeof module?.requestReadAuthorization !== 'function') {
      throw createUnavailableError('requestReadAuthorization');
    }

    return module.requestReadAuthorization();
  },

  async fetchHealthData(
    request: TrainerHealthKitFetchRequest,
  ): Promise<TrainerHealthKitFetchResult> {
    const module = getNativeModule();

    if (typeof module?.fetchHealthData !== 'function') {
      throw createUnavailableError('fetchHealthData');
    }

    return module.fetchHealthData(request);
  },
};
