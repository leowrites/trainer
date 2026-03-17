import React from 'react';
import { View } from 'react-native';

import {
  Body,
  Button,
  Caption,
  Card,
  Label,
  Muted,
  StatValue,
} from '@shared/components';
import {
  formatBodyWeightValue,
  formatLoggedAtLabel,
  type BodyWeightEntry,
} from '../domain/body-weight';

interface BodyWeightEntryCardProps {
  entry: BodyWeightEntry;
  isEditing: boolean;
  onEdit: (entry: BodyWeightEntry) => void;
  onDelete: (id: string) => void;
}

export function BodyWeightEntryCard({
  entry,
  isEditing,
  onEdit,
  onDelete,
}: BodyWeightEntryCardProps): React.JSX.Element {
  return (
    <Card className="rounded-2xl">
      <View className="flex-row items-start justify-between gap-4">
        <View className="flex-1">
          <Label>Logged</Label>
          <Body className="mt-1">{formatLoggedAtLabel(entry.loggedAt)}</Body>
          <Caption className="mt-1">
            {isEditing
              ? 'Currently editing this log.'
              : 'Saved on this device.'}
          </Caption>
        </View>

        <View className="items-end">
          <Label>Weight</Label>
          <StatValue className="mt-1 text-[30px]">
            {formatBodyWeightValue(entry.weight)}
          </StatValue>
          <Caption className="mt-1 uppercase">{entry.unit}</Caption>
        </View>
      </View>

      {entry.notes ? (
        <Body className="mt-4">{entry.notes}</Body>
      ) : (
        <Muted className="mt-4">No notes for this entry.</Muted>
      )}

      <View className="mt-4 flex-row gap-2">
        <Button
          variant={isEditing ? 'secondary' : 'ghost'}
          size="sm"
          className="flex-1"
          onPress={() => onEdit(entry)}
          accessibilityLabel={`Edit ${formatLoggedAtLabel(entry.loggedAt)}`}
        >
          {isEditing ? 'Editing' : 'Edit'}
        </Button>
        <Button
          variant="danger"
          size="sm"
          className="flex-1"
          onPress={() => onDelete(entry.id)}
          accessibilityLabel={`Delete ${formatLoggedAtLabel(entry.loggedAt)}`}
        >
          Delete
        </Button>
      </View>
    </Card>
  );
}
