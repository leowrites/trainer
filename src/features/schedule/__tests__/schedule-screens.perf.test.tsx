import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { buildProfilerCapture } from '@core/performance/testing';
import { useRoutines } from '@features/routines';
import { useScheduleEntries } from '../hooks/use-schedule-entries';
import { useScheduleEntryIndex } from '../hooks/use-schedule-entry-index';
import { useSchedules } from '../hooks/use-schedules';
import { ScheduleDetailScreen } from '../screens/schedule-detail-screen';
import { ScheduleListScreen } from '../screens/schedule-list-screen';

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (callback: () => void) => callback(),
}));

jest.mock('@shared/hooks', () => ({
  useReducedMotionPreference: () => false,
}));

jest.mock('@expo/vector-icons', () => {
  const ReactNative = require('react-native');
  return {
    Feather: ({ name }: { name: string }) => (
      <ReactNative.Text>{name}</ReactNative.Text>
    ),
  };
});

jest.mock('@core/theme/theme-context', () => ({
  useTheme: () => ({
    tokens: {
      textPrimary: '#111111',
    },
  }),
}));

jest.mock('@features/routines', () => ({
  useRoutines: jest.fn(),
}));

jest.mock('../hooks/use-schedule-entries', () => ({
  useScheduleEntries: jest.fn(),
}));

jest.mock('../hooks/use-schedule-entry-index', () => ({
  useScheduleEntryIndex: jest.fn(),
}));

jest.mock('../hooks/use-schedules', () => ({
  useSchedules: jest.fn(),
}));

jest.mock('../components/routine-picker-sheet', () => ({
  RoutinePickerSheet: () => null,
}));

jest.mock('react-native-draggable-flatlist', () => {
  const ReactNative = require('react-native');
  return {
    __esModule: true,
    default: ({
      ListHeaderComponent,
      ListFooterComponent,
      data,
      renderItem,
    }: {
      ListHeaderComponent?: React.ReactNode;
      ListFooterComponent?: React.ReactNode;
      data: Array<{ id: string }>;
      renderItem: (args: {
        item: { id: string };
        drag: () => void;
        isActive: boolean;
      }) => React.ReactNode;
    }) => (
      <ReactNative.View>
        {ListHeaderComponent}
        {data.map((item) => (
          <ReactNative.View key={item.id}>
            {renderItem({
              item,
              drag: () => undefined,
              isActive: false,
            })}
          </ReactNative.View>
        ))}
        {ListFooterComponent}
      </ReactNative.View>
    ),
  };
});

const mockUseSchedules = jest.mocked(useSchedules);
const mockUseRoutines = jest.mocked(useRoutines);
const mockUseScheduleEntries = jest.mocked(useScheduleEntries);
const mockUseScheduleEntryIndex = jest.mocked(useScheduleEntryIndex);

describe('schedule screen perf contracts', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseSchedules.mockReturnValue({
      schedules: [
        {
          id: 'schedule-1',
          name: 'Upper Split',
          is_active: 1,
          current_position: 0,
        },
      ],
      hasLoaded: true,
      refresh: jest.fn(),
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
    });

    mockUseScheduleEntryIndex.mockReturnValue({
      entriesByScheduleId: {
        'schedule-1': [
          {
            id: 'entry-1',
            schedule_id: 'schedule-1',
            routine_id: 'routine-1',
            position: 0,
          },
        ],
      },
      refresh: jest.fn(),
    });

    mockUseScheduleEntries.mockReturnValue({
      isLoading: false,
      entries: [
        {
          id: 'entry-1',
          schedule_id: 'schedule-1',
          routine_id: 'routine-1',
          position: 0,
        },
      ],
      refresh: jest.fn(),
    });
  });

  it('keeps schedule-list create interaction within a small commit budget', () => {
    const capture = buildProfilerCapture('ScheduleListScreen');
    const navigate = jest.fn();

    render(
      <capture.Harness>
        <ScheduleListScreen
          navigation={{ navigate } as never}
          route={{ key: 'schedule-list', name: 'ScheduleList' } as never}
        />
      </capture.Harness>,
    );

    capture.reset();
    fireEvent.press(screen.getByText('New Schedule'));

    expect(navigate).toHaveBeenCalledWith('ScheduleDetail', {});
    expect(capture.commits().length).toBeLessThanOrEqual(2);
  });

  it('keeps schedule-detail add-routine interaction within a small commit budget', () => {
    const capture = buildProfilerCapture('ScheduleDetailScreen');

    render(
      <capture.Harness>
        <ScheduleDetailScreen
          navigation={
            {
              goBack: jest.fn(),
              setOptions: jest.fn(),
            } as never
          }
          route={{
            key: 'schedule-detail',
            name: 'ScheduleDetail',
            params: { scheduleId: 'schedule-1' },
          }}
        />
      </capture.Harness>,
    );

    capture.reset();
    fireEvent.press(screen.getByText('Add Routine'));

    expect(capture.commits().length).toBeLessThanOrEqual(2);
  });
});
