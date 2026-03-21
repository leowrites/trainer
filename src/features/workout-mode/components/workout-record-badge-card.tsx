/**
 * Workout record badge card.
 *
 * CALLING SPEC:
 * - Renders one earned badge for the workout summary screen.
 * - Accepts a computed `WorkoutRecordBadge` and maps its tone to shared badge
 *   styling plus a small text card treatment.
 */

import React from 'react';
import { View } from 'react-native';

import { Badge, Body, Caption, Card } from '@shared/components';
import type { WorkoutRecordBadge } from '../summary-types';

export function WorkoutRecordBadgeCard({
  badge,
}: {
  badge: WorkoutRecordBadge;
}): React.JSX.Element {
  return (
    <Card className="min-w-40 flex-1 rounded-3xl bg-surface-elevated px-4 py-4">
      <Badge variant={badge.tone}>{badge.label}</Badge>
      <Body className="mt-4 font-medium">{badge.detail}</Body>
      {badge.exerciseName ? (
        <Caption className="mt-2">{badge.exerciseName}</Caption>
      ) : (
        <View className="mt-2 h-4" />
      )}
    </Card>
  );
}
