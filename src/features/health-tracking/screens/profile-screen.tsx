/**
 * Profile screen.
 *
 * CALLING SPEC:
 *   <ProfileScreen />
 *
 * Inputs:
 *   - None.
 * Outputs:
 *   - Local profile settings, Apple Health import controls, step summaries,
 *     and mixed-source body-weight history.
 * Side effects:
 *   - Reads and writes SQLite via feature hooks and triggers Apple Health import actions.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform, ScrollView, View } from 'react-native';

import { useFocusEffect } from '@react-navigation/native';

import {
  ActionRow,
  Badge,
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
  canImportAppleHealth,
  type AppleHealthAuthorizationSnapshot,
} from '../domain/apple-health';
import {
  BODY_WEIGHT_UNITS,
  bodyWeightEntryToFormState,
  buildLoggedAtTimestamp,
  createBodyWeightFormState,
  formatBodyWeightValue,
  formatLoggedAtLabel,
  isManualBodyWeightEntry,
  type BodyWeightEntry,
  type BodyWeightFormState,
  type BodyWeightUnit,
} from '../domain/body-weight';
import { useAppleHealth } from '../hooks/use-apple-health';
import { useBodyWeightEntries } from '../hooks/use-body-weight-entries';
import { useDailyStepEntries } from '../hooks/use-daily-step-entries';
import { useUserProfile } from '../hooks/use-user-profile';
import { BodyWeightEntryCard } from '../components/body-weight-entry-card';
import { BodyWeightForm } from '../components/body-weight-form';

function formatImportTimestamp(timestamp: number | null | undefined): string {
  if (!timestamp) {
    return 'No imports yet.';
  }

  return `Last import: ${formatLoggedAtLabel(timestamp)}`;
}

function formatStepCount(stepCount: number): string {
  return stepCount.toLocaleString();
}

function getAuthorizationSummary(
  authorization: AppleHealthAuthorizationSnapshot,
): string {
  if (
    authorization.bodyWeight === 'unavailable' ||
    authorization.steps === 'unavailable'
  ) {
    return 'Apple Health is unavailable on this device.';
  }

  if (
    authorization.bodyWeight === 'denied' ||
    authorization.steps === 'denied'
  ) {
    return 'Apple Health access is denied. Re-enable body weight and steps in the Apple Health permissions sheet.';
  }

  if (canImportAppleHealth(authorization)) {
    return 'Trainer can read Apple Health body weight and daily steps.';
  }

  return 'Connect Apple Health to import body weight and daily steps into local storage.';
}

export function ProfileScreen(): React.JSX.Element {
  const {
    profile,
    error: profileError,
    refresh: refreshProfile,
    saveProfile,
  } = useUserProfile();
  const {
    entries,
    error: bodyWeightError,
    refresh: refreshBodyWeight,
    createEntry,
    updateEntry,
    deleteEntry,
  } = useBodyWeightEntries();
  const {
    entries: dailyStepEntries,
    error: dailyStepError,
    refresh: refreshDailySteps,
  } = useDailyStepEntries();
  const {
    isSupported: isAppleHealthSupported,
    isAvailable: isAppleHealthAvailable,
    authorization,
    syncState,
    loading: appleHealthLoading,
    requestingAccess,
    importing,
    error: appleHealthError,
    refresh: refreshAppleHealth,
    requestAccess,
    importLatest,
  } = useAppleHealth();
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
      refreshBodyWeight();
      refreshDailySteps();
      refreshAppleHealth();
    }, [
      refreshAppleHealth,
      refreshBodyWeight,
      refreshDailySteps,
      refreshProfile,
    ]),
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
    if (!isManualBodyWeightEntry(entry)) {
      return;
    }

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

  const handleConnectAppleHealth = useCallback(async (): Promise<void> => {
    try {
      await requestAccess();
    } catch {
      // Hook state already captures the user-facing error.
    }
  }, [requestAccess]);

  const handleImportAppleHealth = useCallback(async (): Promise<void> => {
    const result = await importLatest();

    if (result) {
      refreshBodyWeight();
      refreshDailySteps();
    }
  }, [importLatest, refreshBodyWeight, refreshDailySteps]);

  const latestEntry = entries[0] ?? null;
  const latestStepEntry = dailyStepEntries[0] ?? null;
  const statusMessages = [
    profileError,
    bodyWeightError,
    dailyStepError,
    appleHealthError,
  ].filter((message): message is string => message !== null);

  const appleHealthBadgeVariant = useMemo(() => {
    if (!isAppleHealthSupported || !isAppleHealthAvailable) {
      return 'muted' as const;
    }

    if (
      authorization.bodyWeight === 'denied' ||
      authorization.steps === 'denied'
    ) {
      return 'warning' as const;
    }

    if (canImportAppleHealth(authorization)) {
      return 'accent' as const;
    }

    return 'muted' as const;
  }, [authorization, isAppleHealthAvailable, isAppleHealthSupported]);

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
              Keep local profile defaults, import Apple Health data on iPhone,
              and review body-weight history offline on this device.
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
              Home greetings and analytics surfaces will use these local profile
              defaults.
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
          <Card label="Apple Health" className="rounded-[24px] px-5 py-5">
            <View className="gap-4">
              <View className="flex-row items-center justify-between gap-3">
                <View className="flex-1">
                  <Label>Connection</Label>
                  <Body className="mt-1">
                    {getAuthorizationSummary(authorization)}
                  </Body>
                </View>
                <Badge variant={appleHealthBadgeVariant}>
                  {isAppleHealthSupported && isAppleHealthAvailable
                    ? canImportAppleHealth(authorization)
                      ? 'Connected'
                      : authorization.bodyWeight === 'denied' ||
                          authorization.steps === 'denied'
                        ? 'Blocked'
                        : 'Not Connected'
                    : Platform.OS === 'ios'
                      ? 'Unavailable'
                      : 'iPhone Only'}
                </Badge>
              </View>

              <Muted className="text-sm leading-[17px]">
                Trainer reads body weight and daily steps only. Imported data is
                copied into local storage so it remains available offline.
              </Muted>

              <Muted className="text-sm leading-[17px]">
                {syncState?.lastStatus === 'error' && syncState.lastError
                  ? syncState.lastError
                  : formatImportTimestamp(syncState?.updatedAt)}
              </Muted>

              {isAppleHealthSupported && isAppleHealthAvailable ? (
                canImportAppleHealth(authorization) ? (
                  <Button
                    onPress={() => {
                      void handleImportAppleHealth();
                    }}
                    loading={importing}
                    disabled={appleHealthLoading || importing}
                  >
                    Import latest data
                  </Button>
                ) : (
                  <Button
                    onPress={() => {
                      void handleConnectAppleHealth();
                    }}
                    loading={requestingAccess}
                    disabled={appleHealthLoading || requestingAccess}
                  >
                    Connect Apple Health
                  </Button>
                )
              ) : isAppleHealthSupported ? (
                <Body>Apple Health is not available on this device.</Body>
              ) : (
                <Body>Apple Health import is available on iPhone only.</Body>
              )}
            </View>
          </Card>
        </View>

        <View className="pb-4">
          <Card label="Daily Steps" className="rounded-[24px] px-5 py-5">
            {latestStepEntry ? (
              <View className="gap-4">
                <StatRow
                  value={formatStepCount(latestStepEntry.stepCount)}
                  unit="steps"
                  sub={`${latestStepEntry.dayKey} | ${dailyStepEntries.length} imported days shown`}
                />
                <View className="gap-2">
                  {dailyStepEntries.map((entry) => (
                    <View
                      key={entry.id}
                      className="flex-row items-center justify-between gap-3"
                    >
                      <Body>{entry.dayKey}</Body>
                      <Body>{formatStepCount(entry.stepCount)}</Body>
                    </View>
                  ))}
                </View>
              </View>
            ) : (
              <View>
                <Body>No imported step totals yet.</Body>
                <Muted className="mt-2">
                  Connect Apple Health and import recent data to populate this
                  summary.
                </Muted>
              </View>
            )}
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
                  Your first manual or imported body-weight entry will appear
                  here.
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
