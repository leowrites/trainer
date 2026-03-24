/**
 * Navigation core module
 *
 * Root navigation configuration. Screens and tab/stack navigators will be
 * wired up here as feature slices are implemented.
 */
export { RootNavigator } from './root-navigator';
export { navigateToActiveWorkoutScreen } from './root-navigator';
export { rootNavigationRef } from './root-navigator';
export type { RootStackParamList, RootTabParamList } from './root-navigator';
