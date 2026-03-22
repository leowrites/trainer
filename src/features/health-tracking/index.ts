/**
 * Health Tracking feature slice
 *
 * Tracks body weight, daily step counts, and other physical activities
 * to provide a holistic picture of the user's fitness journey.
 */
export { ProfileScreen } from './screens/profile-screen';
export { useAppleHealth } from './hooks/use-apple-health';
export { useBodyWeightEntries } from './hooks/use-body-weight-entries';
export { useDailyStepEntries } from './hooks/use-daily-step-entries';
export { useUserProfile } from './hooks/use-user-profile';
export type {
  AppleHealthAuthorizationSnapshot,
  AppleHealthImportResult,
} from './domain/apple-health';
export type {
  BodyWeightEntry,
  BodyWeightEntryInput,
  BodyWeightFormState,
  BodyWeightSource,
  BodyWeightUnit,
} from './domain/body-weight';
export type { DailyStepEntry } from './domain/daily-steps';
export type { UserProfile, UserProfileInput } from './domain/user-profile';
