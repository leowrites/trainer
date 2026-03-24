/**
 * Workout header duration.
 *
 * CALLING SPEC:
 * - Renders the elapsed workout duration in the navigation header.
 * - Owns only local one-second clock state for the header label.
 * - Has no persistence side effects.
 */

import React from 'react';
import { Text } from 'react-native';

import { useLiveSecond } from '../hooks/use-live-second';
import { formatElapsedDuration } from '../utils/formatters';

export function WorkoutHeaderRight({
  startTime,
}: {
  startTime: number | null;
}): React.JSX.Element {
  const now = useLiveSecond(startTime !== null);
  const durationLabel =
    startTime === null ? '0m' : formatElapsedDuration(now - startTime);

  return (
    <Text className="p-2 font-heading text-lg text-foreground">
      {durationLabel}
    </Text>
  );
}
