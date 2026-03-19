import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { useFocusEffect } from '@react-navigation/native';

import {
  ActionRow,
  Body,
  Button,
  Card,
  Container,
  Heading,
  Input,
  Label,
  Muted,
  StatRow,
} from '@shared/components';
import {
  BODY_WEIGHT_UNITS,
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
import { useUserProfile } from '../hooks/use-user-profile';
import { BodyWeightEntryCard } from '../components/body-weight-entry-card';
import { BodyWeightForm } from '../components/body-weight-form';

export function ProfileScreen(): React.JSX.Element {
  const {
    profile,
    error: profileError,
    refresh: refreshProfile,
    saveProfile,
  } = useUserProfile();
  const { entries, error, refresh, createEntry, updateEntry, deleteEntry } =
    useBodyWeightEntries();
  const [profileName, setProfileName] = useState('');
  const [preferredWeightUnit, setPreferredWeightUnit] =
    useState<BodyWeightUnit>('kg');
  const [profileFormError, setProfileFormError] = useState<string | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);
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
      refreshProfile();
      refresh();
    }, [refresh, refreshProfile]),
  );

  const resetForm = useCallback((): void => {
    setEditingEntry(null);
    setForm(createBodyWeightFormState(Date.now(), preferredWeightUnit));
    setFormError(null);
  }, [preferredWeightUnit]);

  useEffect(() => {
    const nextWeightUnit = profile?.preferredWeightUnit ?? 'kg';
    setProfileName(profile?.displayName ?? '');
    setPreferredWeightUnit(nextWeightUnit);
    setProfileFormError(null);

    if (!editingEntry) {
      setForm((current) => ({ ...current, unit: nextWeightUnit }));
    }
  }, [editingEntry, profile?.displayName, profile?.preferredWeightUnit]);

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

  const handleSaveProfile = useCallback((): void => {
    setProfileSaving(true);

    try {
      saveProfile({
        displayName: profileName,
        preferredWeightUnit,
      });
      setProfileFormError(null);

      if (!editingEntry) {
        setForm((current) => ({ ...current, unit: preferredWeightUnit }));
      }
    } catch {
      setProfileFormError('Unable to save local profile settings.');
    } finally {
      setProfileSaving(false);
    }
  }, [editingEntry, preferredWeightUnit, profileName, saveProfile]);

  const handleResetProfile = useCallback((): void => {
    setProfileName(profile?.displayName ?? '');
    setPreferredWeightUnit(profile?.preferredWeightUnit ?? 'kg');
    setProfileFormError(null);
  }, [profile?.displayName, profile?.preferredWeightUnit]);

  const latestEntry = entries[0] ?? null;
  const statusMessages = [profileError, error].filter(
    (message): message is string => message !== null,
  );

  return (
    <Container className="px-0 pb-0" edges={['left', 'right']}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 28 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="pb-4">
          <View accessibilityRole="header" className="gap-2">
            <Heading className="text-4xl leading-[36px]">Profile</Heading>
            <Muted className="text-sm leading-[19px]">
              Log body weight offline and keep a practical review history on
              this device.
            </Muted>
          </View>
        </View>

        <View className="pb-4">
          <Card label="Profile Details" className="rounded-[24px] px-5 py-5">
            <Label>Display name</Label>
            <Input
              className="mt-3"
              placeholder="Name shown on home screen"
              value={profileName}
              onChangeText={setProfileName}
              autoCapitalize="words"
            />

            <Label className="mb-2 mt-4">Preferred weight unit</Label>
            <View className="flex-row gap-2">
              {BODY_WEIGHT_UNITS.map((unit) => (
                <Button
                  key={unit}
                  variant={preferredWeightUnit === unit ? 'primary' : 'ghost'}
                  size="sm"
                  className="flex-1"
                  onPress={() => setPreferredWeightUnit(unit)}
                  accessibilityLabel={`Use ${unit}`}
                >
                  {unit.toUpperCase()}
                </Button>
              ))}
            </View>

            <Muted className="mt-3 text-sm leading-[17px]">
              Home greetings and future analytics surfaces will use these local
              profile defaults.
            </Muted>

            {profileFormError ? (
              <Body className="mt-3 text-error">{profileFormError}</Body>
            ) : null}

            <ActionRow
              primaryLabel="Save profile"
              secondaryLabel="Reset"
              onPrimaryPress={handleSaveProfile}
              primaryLoading={profileSaving}
              onSecondaryPress={handleResetProfile}
            />
          </Card>
        </View>

        <View className="pb-4">
          <Card label="Latest Reading" className="rounded-[24px] px-5 py-5">
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
        </View>

        {statusMessages.length > 0 ? (
          <View className="pb-4">
            <Card label="Status" className="rounded-[24px] px-5 py-5">
              {statusMessages.map((message: string) => (
                <Body key={message} className="text-error">
                  {message}
                </Body>
              ))}
            </Card>
          </View>
        ) : null}

        <View className="pb-4">
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
        </View>

        <View className="pb-2 pt-1">
          <Heading className="text-2xl leading-[24px]">Recent logs</Heading>
          <Muted className="mt-2 text-sm leading-[17px]">
            {entries.length === 0
              ? 'Your saved history will appear here.'
              : `${entries.length} entries saved locally for offline review.`}
          </Muted>
        </View>

        {entries.length === 0 ? (
          <View className="pt-2">
            <Card className="rounded-[24px] px-5 py-5">
              <Body>Log your first entry to start a body-weight history.</Body>
            </Card>
          </View>
        ) : (
          <View className="pt-2">
            {entries.map((entry) => (
              <View key={entry.id} className="mb-3">
                <BodyWeightEntryCard
                  entry={entry}
                  isEditing={editingEntry?.id === entry.id}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </Container>
  );
}
