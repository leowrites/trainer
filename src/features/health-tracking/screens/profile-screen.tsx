import React, { useCallback, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { useFocusEffect } from '@react-navigation/native';

import {
  Body,
  Card,
  Container,
  Heading,
  Muted,
  StatRow,
} from '@shared/components';
import {
  bodyWeightEntryToFormState,
  buildLoggedAtTimestamp,
  createBodyWeightFormState,
  formatBodyWeightValue,
  formatLoggedAtLabel,
  type BodyWeightEntry,
  type BodyWeightFormState,
  type BodyWeightUnit,
} from '../domain/body-weight';
import { useBodyWeightEntries } from '../hooks/use-body-weight-entries';
import { BodyWeightEntryCard } from '../components/body-weight-entry-card';
import { BodyWeightForm } from '../components/body-weight-form';

export function ProfileScreen(): React.JSX.Element {
  const { entries, error, refresh, createEntry, updateEntry, deleteEntry } =
    useBodyWeightEntries();
  const [form, setForm] = useState<BodyWeightFormState>(() =>
    createBodyWeightFormState(),
  );
  const [editingEntry, setEditingEntry] = useState<BodyWeightEntry | null>(
    null,
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const resetForm = useCallback((): void => {
    setEditingEntry(null);
    setForm(createBodyWeightFormState());
    setFormError(null);
  }, []);

  const handleWeightChange = useCallback((weight: string): void => {
    setForm((current) => ({ ...current, weight }));
  }, []);

  const handleUnitChange = useCallback((unit: BodyWeightUnit): void => {
    setForm((current) => ({ ...current, unit }));
  }, []);

  const handleDateChange = useCallback((date: string): void => {
    setForm((current) => ({ ...current, date }));
  }, []);

  const handleTimeChange = useCallback((time: string): void => {
    setForm((current) => ({ ...current, time }));
  }, []);

  const handleNotesChange = useCallback((notes: string): void => {
    setForm((current) => ({ ...current, notes }));
  }, []);

  const handleEdit = useCallback((entry: BodyWeightEntry): void => {
    setEditingEntry(entry);
    setForm(bodyWeightEntryToFormState(entry));
    setFormError(null);
  }, []);

  const handleDelete = useCallback(
    (id: string): void => {
      try {
        if (editingEntry?.id === id) {
          resetForm();
        }

        deleteEntry(id);
        setFormError(null);
      } catch {
        setFormError('Unable to delete this body-weight entry.');
      }
    },
    [deleteEntry, editingEntry?.id, resetForm],
  );

  const handleSave = useCallback((): void => {
    const parsedWeight = Number(form.weight.trim());
    if (!Number.isFinite(parsedWeight) || parsedWeight <= 0) {
      setFormError('Enter a valid body weight greater than zero.');
      return;
    }

    const loggedAt = buildLoggedAtTimestamp(form.date, form.time);
    if (loggedAt === null) {
      setFormError('Enter a valid date and time.');
      return;
    }

    setSaving(true);

    try {
      const nextEntry = {
        weight: parsedWeight,
        unit: form.unit,
        loggedAt,
        notes: form.notes,
      };

      if (editingEntry) {
        updateEntry(editingEntry.id, nextEntry);
      } else {
        createEntry(nextEntry);
      }

      setFormError(null);
      resetForm();
    } catch {
      setFormError('Unable to save this body-weight entry.');
    } finally {
      setSaving(false);
    }
  }, [createEntry, editingEntry, form, resetForm, updateEntry]);

  const latestEntry = entries[0] ?? null;

  return (
    <Container className="pt-8">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="pb-5">
          <Heading>Health</Heading>
          <Muted className="mt-2">
            Log body weight offline and keep a practical review history on this
            device.
          </Muted>
        </View>

        <Card label="Latest Reading" className="mb-4 rounded-2xl">
          {latestEntry ? (
            <StatRow
              value={formatBodyWeightValue(latestEntry.weight)}
              unit={latestEntry.unit}
              sub={`${formatLoggedAtLabel(latestEntry.loggedAt)} | ${entries.length} total logs`}
            />
          ) : (
            <View>
              <Body>No body-weight entries yet.</Body>
              <Muted className="mt-2">
                Your first offline log will appear here.
              </Muted>
            </View>
          )}
        </Card>

        {error ? (
          <Card label="Status" className="mb-4 rounded-2xl">
            <Body className="text-red-400">{error}</Body>
          </Card>
        ) : null}

        <BodyWeightForm
          title={editingEntry ? 'Edit body-weight log' : 'Log body weight'}
          form={form}
          saveLabel={editingEntry ? 'Update entry' : 'Save entry'}
          secondaryLabel={editingEntry ? 'Cancel edit' : 'Reset'}
          saving={saving}
          errorMessage={formError}
          onWeightChange={handleWeightChange}
          onUnitChange={handleUnitChange}
          onDateChange={handleDateChange}
          onTimeChange={handleTimeChange}
          onNotesChange={handleNotesChange}
          onSave={handleSave}
          onSecondaryPress={resetForm}
        />

        <View className="pb-3 pt-6">
          <Heading className="text-[20px]">Recent logs</Heading>
          <Muted className="mt-2">
            {entries.length === 0
              ? 'Your saved history will appear here.'
              : `${entries.length} entries saved locally for offline review.`}
          </Muted>
        </View>

        {entries.length === 0 ? (
          <Card className="rounded-2xl">
            <Body>Log your first entry to start a body-weight history.</Body>
          </Card>
        ) : (
          entries.map((entry) => (
            <View key={entry.id} className="mb-3">
              <BodyWeightEntryCard
                entry={entry}
                isEditing={editingEntry?.id === entry.id}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            </View>
          ))
        )}
      </ScrollView>
    </Container>
  );
}
