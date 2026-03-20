import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { ScheduleScreen } from '../screens/schedule-screen';
import { useSchedules } from '../hooks/use-schedules';
import { useRoutines } from '@features/routines';

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (callback: () => void) => callback(),
}));

jest.mock('../hooks/use-schedules', () => ({
  useSchedules: jest.fn(),
}));

jest.mock('@features/routines', () => ({
  useRoutines: jest.fn(),
}));

const mockUseSchedules = jest.mocked(useSchedules);
const mockUseRoutines = jest.mocked(useRoutines);

describe('ScheduleScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a schedule from the shared form controls', () => {
    const refreshSchedules = jest.fn();
    const refreshRoutines = jest.fn();
    const createSchedule = jest.fn();

    mockUseSchedules.mockReturnValue({
      schedules: [],
      refresh: refreshSchedules,
      version: 0,
      getScheduleEntries: jest.fn().mockReturnValue([]),
      createSchedule,
      updateSchedule: jest.fn(),
      setActiveSchedule: jest.fn(),
      deleteSchedule: jest.fn(),
    });
    mockUseRoutines.mockReturnValue({
      routines: [{ id: 'routine-1', name: 'Push A', notes: null }],
      hasLoaded: true,
      refresh: refreshRoutines,
      createRoutine: jest.fn(),
      updateRoutine: jest.fn(),
      deleteRoutine: jest.fn(),
      getRoutineExercises: jest.fn(),
      getRoutineExerciseCounts: jest.fn().mockReturnValue({}),
    });

    render(<ScheduleScreen />);

    expect(refreshSchedules).toHaveBeenCalledTimes(1);
    expect(refreshRoutines).toHaveBeenCalledTimes(1);

    fireEvent.press(screen.getByText('+ New Schedule'));
    fireEvent.changeText(
      screen.getByPlaceholderText('Schedule name (e.g. Push/Pull Split)'),
      ' Upper Rotation ',
    );
    fireEvent.press(screen.getByLabelText('Push A'));
    fireEvent.press(screen.getByText('Save'));

    expect(createSchedule).toHaveBeenCalledWith({
      name: 'Upper Rotation',
      routineIds: ['routine-1'],
    });
  });

  it('expands a schedule row and shows its ordered routines', () => {
    mockUseSchedules.mockReturnValue({
      schedules: [
        {
          id: 'schedule-1',
          name: 'Upper Split',
          is_active: 1,
          current_position: 0,
        },
      ],
      refresh: jest.fn(),
      version: 1,
      getScheduleEntries: jest.fn().mockReturnValue([
        {
          id: 'entry-1',
          schedule_id: 'schedule-1',
          routine_id: 'routine-1',
          position: 0,
        },
      ]),
      createSchedule: jest.fn(),
      updateSchedule: jest.fn(),
      setActiveSchedule: jest.fn(),
      deleteSchedule: jest.fn(),
    });
    mockUseRoutines.mockReturnValue({
      routines: [{ id: 'routine-1', name: 'Push A', notes: null }],
      hasLoaded: true,
      refresh: jest.fn(),
      createRoutine: jest.fn(),
      updateRoutine: jest.fn(),
      deleteRoutine: jest.fn(),
      getRoutineExercises: jest.fn(),
      getRoutineExerciseCounts: jest.fn().mockReturnValue({}),
    });

    render(<ScheduleScreen />);

    fireEvent.press(screen.getByLabelText('Expand Upper Split'));

    expect(screen.getByText('1. Push A')).toBeTruthy();
    expect(screen.getAllByText('Active').length).toBeGreaterThan(0);
  });
});
