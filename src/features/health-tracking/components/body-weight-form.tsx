import React from 'react';
import { View } from 'react-native';

import {
  ActionRow,
  Body,
  Button,
  Card,
  Caption,
  Input,
  Label,
} from '@shared/components';
import {
  BODY_WEIGHT_UNITS,
  type BodyWeightFormState,
  type BodyWeightUnit,
} from '../domain/body-weight';

interface BodyWeightFormProps {
  title: string;
  form: BodyWeightFormState;
  saveLabel: string;
  secondaryLabel: string;
  saving?: boolean;
  errorMessage?: string | null;
  onWeightChange: (value: string) => void;
  onUnitChange: (unit: BodyWeightUnit) => void;
  onDateChange: (value: string) => void;
  onTimeChange: (value: string) => void;
  onNotesChange: (value: string) => void;
  onSave: () => void;
  onSecondaryPress: () => void;
}

export function BodyWeightForm({
  title,
  form,
  saveLabel,
  secondaryLabel,
  saving = false,
  errorMessage = null,
  onWeightChange,
  onUnitChange,
  onDateChange,
  onTimeChange,
  onNotesChange,
  onSave,
  onSecondaryPress,
}: BodyWeightFormProps): React.JSX.Element {
  return (
    <Card label={title} className="rounded-[24px] px-5 py-5">
      <View className="gap-5">
        <View>
          <Label className="mb-2">Weight</Label>
          <Input
            placeholder="Weight (e.g. 72.4)"
            value={form.weight}
            onChangeText={onWeightChange}
            keyboardType="decimal-pad"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="done"
            accessibilityLabel="Weight"
          />
        </View>

        <View>
          <Label className="mb-2">Unit</Label>
          <View className="flex-row gap-2">
            {BODY_WEIGHT_UNITS.map((unit) => (
              <Button
                key={unit}
                variant={form.unit === unit ? 'primary' : 'ghost'}
                className="flex-1"
                onPress={() => onUnitChange(unit)}
                accessibilityLabel={`Use ${unit}`}
              >
                {unit.toUpperCase()}
              </Button>
            ))}
          </View>
        </View>

        <View className="flex-row gap-2">
          <View className="flex-1">
            <Label className="mb-2">Date</Label>
            <Input
              placeholder="YYYY-MM-DD"
              value={form.date}
              onChangeText={onDateChange}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="numbers-and-punctuation"
              accessibilityLabel="Date"
            />
          </View>

          <View className="w-28">
            <Label className="mb-2">Time</Label>
            <Input
              placeholder="HH:mm"
              value={form.time}
              onChangeText={onTimeChange}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="numbers-and-punctuation"
              accessibilityLabel="Time"
            />
          </View>
        </View>

        <Caption className="text-xs leading-[15px] text-muted-foreground">
          Use YYYY-MM-DD and 24-hour HH:mm.
        </Caption>

        <View>
          <Label className="mb-2">Notes</Label>
          <Input
            placeholder="Optional notes"
            value={form.notes}
            onChangeText={onNotesChange}
            multiline
            numberOfLines={3}
            accessibilityLabel="Notes"
          />
        </View>

        {errorMessage ? (
          <Body className="text-error" accessibilityRole="alert">
            {errorMessage}
          </Body>
        ) : null}

        <ActionRow
          primaryLabel={saveLabel}
          secondaryLabel={secondaryLabel}
          onPrimaryPress={onSave}
          onSecondaryPress={onSecondaryPress}
          primaryLoading={saving}
          primaryDisabled={form.weight.trim().length === 0}
        />
      </View>
    </Card>
  );
}
