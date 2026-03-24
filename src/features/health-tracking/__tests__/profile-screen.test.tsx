import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { buildProfilerCapture } from '@core/performance/testing';
import { buildLoggedAtTimestamp } from '../domain/body-weight';
import { useBodyWeightEntries } from '../hooks/use-body-weight-entries';
import { useUserProfile } from '../hooks/use-user-profile';
import { ProfileScreen } from '../screens/profile-screen';

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (callback: () => void) => callback(),
}));

jest.mock('../hooks/use-body-weight-entries', () => ({
  useBodyWeightEntries: jest.fn(),
}));

jest.mock('../hooks/use-user-profile', () => ({
  useUserProfile: jest.fn(),
}));

const mockUseBodyWeightEntries = jest.mocked(useBodyWeightEntries);
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

  it('keeps profile-save interactions within a small commit budget', () => {
    const capture = buildProfilerCapture('ProfileScreen');

    mockUseBodyWeightEntries.mockReturnValue({
      entries: [],
      error: null,
      refresh: jest.fn(),
      createEntry: jest.fn(),
      updateEntry: jest.fn(),
      deleteEntry: jest.fn(),
    });

    render(
      <capture.Harness>
        <ProfileScreen />
      </capture.Harness>,
    );

    capture.reset();
    fireEvent.changeText(
      screen.getByPlaceholderText('Name shown on home screen'),
      'Perf Tester',
    );
    fireEvent.press(screen.getByText('Save profile'));

    expect(capture.commits().length).toBeLessThanOrEqual(3);
  });
});
