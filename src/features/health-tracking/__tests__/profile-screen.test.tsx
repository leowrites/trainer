import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { buildLoggedAtTimestamp } from '../domain/body-weight';
import { useBodyWeightEntries } from '../hooks/use-body-weight-entries';
import { ProfileScreen } from '../screens/profile-screen';

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (callback: () => void) => callback(),
}));

jest.mock('../hooks/use-body-weight-entries', () => ({
  useBodyWeightEntries: jest.fn(),
}));

const mockUseBodyWeightEntries = jest.mocked(useBodyWeightEntries);

describe('ProfileScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

    expect(refresh).toHaveBeenCalledTimes(1);

    fireEvent.changeText(
      screen.getByPlaceholderText('Weight (e.g. 72.4)'),
      '181.6',
    );
    fireEvent.press(screen.getByLabelText('Use lb'));
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
});
