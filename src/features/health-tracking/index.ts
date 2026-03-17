/**
 * Health Tracking feature slice
 *
 * Tracks body weight, daily step counts, and other physical activities
 * to provide a holistic picture of the user's fitness journey.
 */
export { ProfileScreen } from './screens/profile-screen';
export { useBodyWeightEntries } from './hooks/use-body-weight-entries';
export type {
  BodyWeightEntry,
  BodyWeightEntryInput,
  BodyWeightFormState,
  BodyWeightUnit,
} from './domain/body-weight';
