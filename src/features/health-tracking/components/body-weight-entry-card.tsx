import React from 'react';
import { View } from 'react-native';

import {
  Badge,
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
  isManualBodyWeightEntry,
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
  const isManualEntry = isManualBodyWeightEntry(entry);

  return (
    <Card className="rounded-[24px] px-5 py-5">
      <View className="flex-row items-start justify-between gap-4">
        <View className="flex-1">
          <View className="flex-row items-center gap-2">
            <Label className="text-muted-foreground">Logged</Label>
            <Badge variant={isManualEntry ? 'muted' : 'accent'}>
              {isManualEntry ? 'Manual' : 'Apple Health'}
            </Badge>
          </View>
          <Body className="mt-1">{formatLoggedAtLabel(entry.loggedAt)}</Body>
          <Caption className="mt-1">
            {isManualEntry
              ? isEditing
                ? 'Currently editing this log.'
                : 'Saved on this device.'
              : `Imported from ${entry.sourceApp ?? 'Apple Health'}.`}
          </Caption>
        </View>

        <View className="items-end">
          <Label className="text-muted-foreground">Weight</Label>
          <StatValue className="mt-1 text-3xl">
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

      {isManualEntry ? (
        <View className="mt-5 flex-row items-center justify-end gap-2">
          <Button
            variant={isEditing ? 'secondary' : 'ghost'}
            size="sm"
            onPress={() => onEdit(entry)}
            accessibilityLabel={`Edit ${formatLoggedAtLabel(entry.loggedAt)}`}
          >
            {isEditing ? 'Editing' : 'Edit'}
          </Button>
          <Button
            variant="danger"
            size="sm"
            onPress={() => onDelete(entry.id)}
            accessibilityLabel={`Delete ${formatLoggedAtLabel(entry.loggedAt)}`}
          >
            Delete
          </Button>
        </View>
      ) : null}
    </Card>
  );
}
