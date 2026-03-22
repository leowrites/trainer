import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { buildLoggedAtTimestamp } from '../domain/body-weight';
import { useAppleHealth } from '../hooks/use-apple-health';
import { useBodyWeightEntries } from '../hooks/use-body-weight-entries';
import { useDailyStepEntries } from '../hooks/use-daily-step-entries';
import { useUserProfile } from '../hooks/use-user-profile';
import { ProfileScreen } from '../screens/profile-screen';

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (callback: () => void) => callback(),
}));

jest.mock('../hooks/use-body-weight-entries', () => ({
  useBodyWeightEntries: jest.fn(),
}));

jest.mock('../hooks/use-daily-step-entries', () => ({
  useDailyStepEntries: jest.fn(),
}));

jest.mock('../hooks/use-apple-health', () => ({
  useAppleHealth: jest.fn(),
}));

jest.mock('../hooks/use-user-profile', () => ({
  useUserProfile: jest.fn(),
}));

const mockUseBodyWeightEntries = jest.mocked(useBodyWeightEntries);
const mockUseDailyStepEntries = jest.mocked(useDailyStepEntries);
const mockUseAppleHealth = jest.mocked(useAppleHealth);
const mockUseUserProfile = jest.mocked(useUserProfile);

describe('ProfileScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseUserProfile.mockReturnValue({
      profile: {
        id: 'profile-1',
        displayName: 'Leo',
        preferredWeightUnit: 'lb',
        createdAt: 1,
        updatedAt: 2,
      },
      error: null,
      refresh: jest.fn(),
      saveProfile: jest.fn(),
    });
    mockUseDailyStepEntries.mockReturnValue({
      entries: [],
      error: null,
      refresh: jest.fn(),
    });
    mockUseAppleHealth.mockReturnValue({
      isSupported: true,
      isAvailable: true,
      authorization: {
        bodyWeight: 'not_determined',
        steps: 'not_determined',
      },
      syncState: null,
      loading: false,
      requestingAccess: false,
      importing: false,
      error: null,
      refresh: jest.fn(),
      requestAccess: jest.fn().mockResolvedValue({
        bodyWeight: 'authorized',
        steps: 'authorized',
      }),
      importLatest: jest.fn().mockResolvedValue(null),
    });
  });

  it('creates a new body-weight entry from the mobile form', () => {
    const refresh = jest.fn();
    const createEntry = jest.fn();

    mockUseBodyWeightEntries.mockReturnValue({
      entries: [],
      error: null,
      refresh,
      createEntry,
      updateEntry: jest.fn(),
      deleteEntry: jest.fn(),
    });

    render(<ProfileScreen />);

    expect(refresh).toHaveBeenCalled();

    fireEvent.changeText(
      screen.getByPlaceholderText('Weight (e.g. 72.4)'),
      '181.6',
    );
    fireEvent.press(screen.getAllByLabelText('Use lb')[1]);
    fireEvent.changeText(
      screen.getByPlaceholderText('YYYY-MM-DD'),
      '2026-03-17',
    );
    fireEvent.changeText(screen.getByPlaceholderText('HH:mm'), '07:30');
    fireEvent.changeText(
      screen.getByPlaceholderText('Optional notes'),
      'Morning check-in',
    );
    fireEvent.press(screen.getByText('Save entry'));

    expect(createEntry).toHaveBeenCalledWith({
      weight: 181.6,
      unit: 'lb',
      loggedAt: buildLoggedAtTimestamp('2026-03-17', '07:30'),
      notes: 'Morning check-in',
    });
  });

  it('saves local profile settings from the profile details card', () => {
    const saveProfile = jest.fn();

    mockUseUserProfile.mockReturnValue({
      profile: {
        id: 'profile-1',
        displayName: 'Leo',
        preferredWeightUnit: 'lb',
        createdAt: 1,
        updatedAt: 2,
      },
      error: null,
      refresh: jest.fn(),
      saveProfile,
    });
    mockUseBodyWeightEntries.mockReturnValue({
      entries: [],
      error: null,
      refresh: jest.fn(),
      createEntry: jest.fn(),
      updateEntry: jest.fn(),
      deleteEntry: jest.fn(),
    });

    render(<ProfileScreen />);

    fireEvent.changeText(
      screen.getByPlaceholderText('Name shown on home screen'),
      'Leo Writes',
    );
    fireEvent.press(screen.getAllByLabelText('Use kg')[0]);
    fireEvent.press(screen.getByText('Save profile'));

    expect(saveProfile).toHaveBeenCalledWith({
      displayName: 'Leo Writes',
      preferredWeightUnit: 'kg',
    });
  });

  it('enters edit mode and updates an existing entry', () => {
    const updateEntry = jest.fn();

    mockUseBodyWeightEntries.mockReturnValue({
      entries: [
        {
          id: 'weight-1',
          weight: 72.4,
          unit: 'kg',
          loggedAt: buildLoggedAtTimestamp('2026-03-16', '08:00') ?? 0,
          notes: 'Fasted',
          source: 'manual',
          sourceRecordId: null,
          sourceApp: null,
          importedAt: null,
        },
      ],
      error: null,
      refresh: jest.fn(),
      createEntry: jest.fn(),
      updateEntry,
      deleteEntry: jest.fn(),
    });

    render(<ProfileScreen />);

    fireEvent.press(screen.getByText('Edit'));
    expect(screen.getByText('Edit body-weight log')).toBeTruthy();

    fireEvent.changeText(
      screen.getByPlaceholderText('Weight (e.g. 72.4)'),
      '73.1',
    );
    fireEvent.changeText(screen.getByPlaceholderText('HH:mm'), '08:15');
    fireEvent.press(screen.getByText('Update entry'));

    expect(updateEntry).toHaveBeenCalledWith('weight-1', {
      weight: 73.1,
      unit: 'kg',
      loggedAt: buildLoggedAtTimestamp('2026-03-16', '08:15'),
      notes: 'Fasted',
    });
  });

  it('deletes a logged entry from the review list', () => {
    const deleteEntry = jest.fn();

    mockUseBodyWeightEntries.mockReturnValue({
      entries: [
        {
          id: 'weight-1',
          weight: 72.4,
          unit: 'kg',
          loggedAt: buildLoggedAtTimestamp('2026-03-16', '08:00') ?? 0,
          notes: null,
          source: 'manual',
          sourceRecordId: null,
          sourceApp: null,
          importedAt: null,
        },
      ],
      error: null,
      refresh: jest.fn(),
      createEntry: jest.fn(),
      updateEntry: jest.fn(),
      deleteEntry,
    });

    render(<ProfileScreen />);

    fireEvent.press(screen.getByText('Delete'));

    expect(deleteEntry).toHaveBeenCalledWith('weight-1');
  });

  it('shows a form error when saving fails', () => {
    mockUseBodyWeightEntries.mockReturnValue({
      entries: [],
      error: null,
      refresh: jest.fn(),
      createEntry: jest.fn(() => {
        throw new Error('insert failed');
      }),
      updateEntry: jest.fn(),
      deleteEntry: jest.fn(),
    });

    render(<ProfileScreen />);

    fireEvent.changeText(
      screen.getByPlaceholderText('Weight (e.g. 72.4)'),
      '181.6',
    );
    fireEvent.changeText(
      screen.getByPlaceholderText('YYYY-MM-DD'),
      '2026-03-17',
    );
    fireEvent.changeText(screen.getByPlaceholderText('HH:mm'), '07:30');
    fireEvent.press(screen.getByText('Save entry'));

    expect(
      screen.getByText('Unable to save this body-weight entry.'),
    ).toBeTruthy();
  });

  it('shows a form error when deleting fails', () => {
    mockUseBodyWeightEntries.mockReturnValue({
      entries: [
        {
          id: 'weight-1',
          weight: 72.4,
          unit: 'kg',
          loggedAt: buildLoggedAtTimestamp('2026-03-16', '08:00') ?? 0,
          notes: null,
          source: 'manual',
          sourceRecordId: null,
          sourceApp: null,
          importedAt: null,
        },
      ],
      error: null,
      refresh: jest.fn(),
      createEntry: jest.fn(),
      updateEntry: jest.fn(),
      deleteEntry: jest.fn(() => {
        throw new Error('delete failed');
      }),
    });

    render(<ProfileScreen />);

    fireEvent.press(screen.getByText('Delete'));

    expect(
      screen.getByText('Unable to delete this body-weight entry.'),
    ).toBeTruthy();
  });

  it('requests Apple Health access when the connect button is pressed', () => {
    const requestAccess = jest.fn().mockResolvedValue({
      bodyWeight: 'authorized',
      steps: 'authorized',
    });

    mockUseAppleHealth.mockReturnValue({
      isSupported: true,
      isAvailable: true,
      authorization: {
        bodyWeight: 'not_determined',
        steps: 'not_determined',
      },
      syncState: null,
      loading: false,
      requestingAccess: false,
      importing: false,
      error: null,
      refresh: jest.fn(),
      requestAccess,
      importLatest: jest.fn().mockResolvedValue(null),
    });
    mockUseBodyWeightEntries.mockReturnValue({
      entries: [],
      error: null,
      refresh: jest.fn(),
      createEntry: jest.fn(),
      updateEntry: jest.fn(),
      deleteEntry: jest.fn(),
    });

    render(<ProfileScreen />);

    fireEvent.press(screen.getByText('Connect Apple Health'));

    expect(requestAccess).toHaveBeenCalled();
  });

  it('renders imported Apple Health entries as read-only', () => {
    mockUseBodyWeightEntries.mockReturnValue({
      entries: [
        {
          id: 'weight-imported',
          weight: 81.5,
          unit: 'kg',
          loggedAt: buildLoggedAtTimestamp('2026-03-18', '06:30') ?? 0,
          notes: null,
          source: 'apple_health',
          sourceRecordId: 'hk-1',
          sourceApp: 'Health',
          importedAt: buildLoggedAtTimestamp('2026-03-18', '06:45') ?? 0,
        },
      ],
      error: null,
      refresh: jest.fn(),
      createEntry: jest.fn(),
      updateEntry: jest.fn(),
      deleteEntry: jest.fn(),
    });

    render(<ProfileScreen />);

    expect(screen.getByText('Apple Health')).toBeTruthy();
    expect(screen.queryByText('Delete')).toBeNull();
    expect(screen.queryByText('Edit')).toBeNull();
  });
});
