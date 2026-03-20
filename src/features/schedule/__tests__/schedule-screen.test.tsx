import { fireEvent, render, screen } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import React from 'react';
import { Alert } from 'react-native';

import { ScheduleDetailScreen } from '../screens/schedule-detail-screen';
import { ScheduleScreen } from '../screens/schedule-screen';
import { useSchedules } from '../hooks/use-schedules';
import { useRoutines } from '@features/routines';

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');

  return {
    ...actual,
    useFocusEffect: (callback: () => void) => callback(),
  };
});

jest.mock('@react-navigation/elements', () => {
  const actual = jest.requireActual('@react-navigation/elements');

  return {
    ...actual,
    useHeaderHeight: () => 96,
  };
});

jest.mock('@expo/vector-icons', () => {
  const ReactNative = require('react-native');

  return {
    Feather: ({ name }: { name: string }) => (
      <ReactNative.Text>{name}</ReactNative.Text>
    ),
  };
});

jest.mock('../hooks/use-schedules', () => ({
  useSchedules: jest.fn(),
}));

jest.mock('@features/routines', () => ({
  useRoutines: jest.fn(),
}));

jest.mock('@lodev09/react-native-true-sheet', () => {
  const React = require('react');
  const ReactNative = require('react-native');

  return {
    TrueSheet: React.forwardRef(
      (
        { children }: React.PropsWithChildren,
        ref: React.ForwardedRef<{
          present: () => Promise<void>;
          dismiss: () => Promise<void>;
        }>,
      ) => {
        React.useImperativeHandle(ref, () => ({
          present: async () => undefined,
          dismiss: async () => undefined,
        }));

        return <ReactNative.View>{children}</ReactNative.View>;
      },
    ),
  };
});

jest.mock('react-native-draggable-flatlist', () => {
  const ReactNative = require('react-native');

  return {
    __esModule: true,
    default: ({
      data,
      renderItem,
      ListHeaderComponent,
      ListFooterComponent,
      ListEmptyComponent,
      onDragEnd,
    }: {
      data: Array<{ id?: string } | string>;
      renderItem: (props: {
        item: { id?: string } | string;
        drag: () => void;
        isActive: boolean;
        getIndex: () => number;
      }) => React.ReactNode;
      ListHeaderComponent?: React.ReactNode;
      ListFooterComponent?: React.ReactNode;
      ListEmptyComponent?: React.ReactNode;
      onDragEnd?: (params: {
        data: Array<{ id?: string } | string>;
        from: number;
        to: number;
      }) => void;
    }) => (
      <ReactNative.View>
        {ListHeaderComponent}
        {data.length === 0
          ? ListEmptyComponent
          : data.map((item, index) => (
              <ReactNative.View key={typeof item === 'string' ? item : item.id}>
                {renderItem({
                  item,
                  drag: () => {
                    const nextData = [...data];
                    const [moved] = nextData.splice(index, 1);
                    nextData.unshift(moved);
                    onDragEnd?.({ data: nextData, from: index, to: 0 });
                  },
                  isActive: false,
                  getIndex: () => index,
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

void React;

function renderNavigator(): ReturnType<typeof render> {
  return render(
    <NavigationContainer>
      <ScheduleScreen />
    </NavigationContainer>,
  );
}

function buildScheduleHookState(
  overrides?: Partial<ReturnType<typeof useSchedules>>,
): ReturnType<typeof useSchedules> {
  return {
    schedules: [],
    hasLoaded: true,
    refresh: jest.fn(),
    version: 0,
    getScheduleEntries: jest.fn().mockReturnValue([]),
    createSchedule: jest.fn(),
    updateSchedule: jest.fn(),
    setActiveSchedule: jest.fn(),
    deleteSchedule: jest.fn(),
    ...overrides,
  };
}

function buildRoutinesHookState(
  overrides?: Partial<ReturnType<typeof useRoutines>>,
): ReturnType<typeof useRoutines> {
  return {
    routines: [],
    hasLoaded: true,
    refresh: jest.fn(),
    createRoutine: jest.fn(),
    updateRoutine: jest.fn(),
    deleteRoutine: jest.fn(),
    getRoutineExercises: jest.fn(),
    getRoutineExerciseCounts: jest.fn().mockReturnValue({}),
    ...overrides,
  };
}

describe('ScheduleScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('filters schedules by search query and shows the no-results state', () => {
    const getScheduleEntries = jest
      .fn()
      .mockImplementation((scheduleId: string) =>
        scheduleId === 'schedule-1'
          ? [
              {
                id: 'entry-1',
                schedule_id: 'schedule-1',
                routine_id: 'routine-1',
                position: 0,
              },
            ]
          : [],
      );

    mockUseSchedules.mockReturnValue(
      buildScheduleHookState({
        schedules: [
          {
            id: 'schedule-1',
            name: 'Upper Split',
            is_active: 1,
            current_position: -1,
          },
          {
            id: 'schedule-2',
            name: 'Lower Split',
            is_active: 0,
            current_position: -1,
          },
        ],
        getScheduleEntries,
      }),
    );
    mockUseRoutines.mockReturnValue(
      buildRoutinesHookState({
        routines: [{ id: 'routine-1', name: 'Push A', notes: null }],
      }),
    );

    renderNavigator();

    fireEvent.changeText(
      screen.getByPlaceholderText('Search schedules'),
      'upper',
    );

    expect(screen.getByLabelText('Open Upper Split')).toBeTruthy();
    expect(screen.queryByLabelText('Open Lower Split')).toBeNull();

    fireEvent.changeText(
      screen.getByPlaceholderText('Search schedules'),
      'zzz',
    );

    expect(screen.getByText('No matching schedules')).toBeTruthy();
  });

  it('opens schedule detail from the list', () => {
    mockUseSchedules.mockReturnValue(
      buildScheduleHookState({
        schedules: [
          {
            id: 'schedule-1',
            name: 'Upper Split',
            is_active: 0,
            current_position: -1,
          },
        ],
        getScheduleEntries: jest.fn().mockReturnValue([
          {
            id: 'entry-1',
            schedule_id: 'schedule-1',
            routine_id: 'routine-1',
            position: 0,
          },
        ]),
      }),
    );
    mockUseRoutines.mockReturnValue(
      buildRoutinesHookState({
        routines: [{ id: 'routine-1', name: 'Push A', notes: null }],
      }),
    );

    renderNavigator();

    fireEvent.press(screen.getByLabelText('Open Upper Split'));

    expect(screen.getByLabelText('Save')).toBeTruthy();
    expect(screen.getByText('Upper Split')).toBeTruthy();
    expect(screen.queryByDisplayValue('Upper Split')).toBeNull();
  });

  it('enters name edit mode from the title row', () => {
    mockUseSchedules.mockReturnValue(
      buildScheduleHookState({
        schedules: [
          {
            id: 'schedule-1',
            name: 'Upper Split',
            is_active: 0,
            current_position: -1,
          },
        ],
      }),
    );
    mockUseRoutines.mockReturnValue(buildRoutinesHookState());

    renderNavigator();

    fireEvent.press(screen.getByLabelText('Open Upper Split'));
    fireEvent.press(screen.getByLabelText('Edit schedule name'));

    expect(screen.getByDisplayValue('Upper Split')).toBeTruthy();
  });

  it('opens create mode and saves a schedule from the header action', () => {
    let schedules = [] as Array<{
      id: string;
      name: string;
      is_active: number;
      current_position: number;
    }>;
    const entriesBySchedule: Record<
      string,
      Array<{
        id: string;
        schedule_id: string;
        routine_id: string;
        position: number;
      }>
    > = {};
    const createSchedule = jest.fn(
      (input: { name: string; routineIds: string[] }) => {
        const createdSchedule = {
          id: 'schedule-created',
          name: input.name,
          is_active: 0,
          current_position: -1,
        };
        schedules = [createdSchedule];
        entriesBySchedule[createdSchedule.id] = input.routineIds.map(
          (routineId, index) => ({
            id: `entry-${routineId}`,
            schedule_id: createdSchedule.id,
            routine_id: routineId,
            position: index,
          }),
        );
        return createdSchedule;
      },
    );

    mockUseSchedules.mockImplementation(() =>
      buildScheduleHookState({
        schedules,
        createSchedule,
        getScheduleEntries: jest
          .fn()
          .mockImplementation(
            (scheduleId: string) => entriesBySchedule[scheduleId] ?? [],
          ),
      }),
    );
    mockUseRoutines.mockReturnValue(
      buildRoutinesHookState({
        routines: [{ id: 'routine-1', name: 'Push A', notes: null }],
      }),
    );

    renderNavigator();

    fireEvent.press(screen.getByText('New Schedule'));
    fireEvent.changeText(
      screen.getByPlaceholderText('Push / Pull Rotation'),
      ' Upper Rotation ',
    );
    fireEvent.press(screen.getByText('Add Routine'));
    fireEvent.press(screen.getByLabelText('Add Push A'));
    fireEvent.press(screen.getByLabelText('Save'));

    expect(createSchedule).toHaveBeenCalledWith({
      name: 'Upper Rotation',
      routineIds: ['routine-1'],
    });
    expect(screen.queryByPlaceholderText('Push / Pull Rotation')).toBeNull();
  });

  it('adds, reorders, removes, and saves routines from schedule detail', () => {
    const updateSchedule = jest.fn();

    mockUseSchedules.mockReturnValue(
      buildScheduleHookState({
        schedules: [
          {
            id: 'schedule-1',
            name: 'Upper Rotation',
            is_active: 0,
            current_position: -1,
          },
        ],
        updateSchedule,
        getScheduleEntries: jest.fn().mockReturnValue([
          {
            id: 'entry-1',
            schedule_id: 'schedule-1',
            routine_id: 'routine-1',
            position: 0,
          },
          {
            id: 'entry-2',
            schedule_id: 'schedule-1',
            routine_id: 'routine-2',
            position: 1,
          },
        ]),
      }),
    );
    mockUseRoutines.mockReturnValue(
      buildRoutinesHookState({
        routines: [
          { id: 'routine-1', name: 'Push A', notes: null },
          { id: 'routine-2', name: 'Pull A', notes: null },
          { id: 'routine-3', name: 'Legs A', notes: null },
        ],
      }),
    );

    renderNavigator();

    fireEvent.press(screen.getByLabelText('Open Upper Rotation'));
    fireEvent.press(screen.getByLabelText('Remove Push A'));
    fireEvent.press(screen.getByText('Add Routine'));
    fireEvent.press(screen.getByLabelText('Add Legs A'));
    fireEvent(screen.getByLabelText('Reorder Legs A'), 'onLongPress');
    fireEvent.press(screen.getByLabelText('Save'));

    expect(updateSchedule).toHaveBeenCalledWith('schedule-1', {
      name: 'Upper Rotation',
      routineIds: ['routine-3', 'routine-2'],
    });
  });

  it('sets an inactive schedule active from the detail screen', () => {
    const setActiveSchedule = jest.fn();

    mockUseSchedules.mockReturnValue(
      buildScheduleHookState({
        schedules: [
          {
            id: 'schedule-1',
            name: 'Upper Rotation',
            is_active: 0,
            current_position: -1,
          },
        ],
        setActiveSchedule,
        getScheduleEntries: jest.fn().mockReturnValue([
          {
            id: 'entry-1',
            schedule_id: 'schedule-1',
            routine_id: 'routine-1',
            position: 0,
          },
        ]),
      }),
    );
    mockUseRoutines.mockReturnValue(
      buildRoutinesHookState({
        routines: [{ id: 'routine-1', name: 'Push A', notes: null }],
      }),
    );

    renderNavigator();

    fireEvent.press(screen.getByLabelText('Open Upper Rotation'));
    fireEvent.press(screen.getByText('Set Active'));

    expect(setActiveSchedule).toHaveBeenCalledWith('schedule-1');
  });

  it('deletes a schedule from detail and dismisses the modal', () => {
    const deleteSchedule = jest.fn();
    const alertSpy = jest
      .spyOn(Alert, 'alert')
      .mockImplementation((_title, _message, buttons) => {
        buttons?.[1]?.onPress?.();
      });

    mockUseSchedules.mockReturnValue(
      buildScheduleHookState({
        schedules: [
          {
            id: 'schedule-1',
            name: 'Upper Rotation',
            is_active: 0,
            current_position: -1,
          },
        ],
        deleteSchedule,
        getScheduleEntries: jest.fn().mockReturnValue([]),
      }),
    );
    mockUseRoutines.mockReturnValue(buildRoutinesHookState());

    renderNavigator();

    fireEvent.press(screen.getByLabelText('Open Upper Rotation'));
    fireEvent.press(screen.getByText('Delete Schedule'));

    expect(deleteSchedule).toHaveBeenCalledWith('schedule-1');

    alertSpy.mockRestore();
  });

  it('waits for schedules to load before leaving an invalid detail route', () => {
    const navigation = {
      goBack: jest.fn(),
      setOptions: jest.fn(),
      replace: jest.fn(),
    } as unknown as Parameters<typeof ScheduleDetailScreen>[0]['navigation'];

    mockUseSchedules.mockReturnValue(
      buildScheduleHookState({
        schedules: [],
        hasLoaded: false,
      }),
    );
    mockUseRoutines.mockReturnValue(buildRoutinesHookState());

    const view = render(
      <ScheduleDetailScreen
        route={{
          key: 'schedule-detail',
          name: 'ScheduleDetail',
          params: { scheduleId: 'missing' },
        }}
        navigation={navigation}
      />,
    );

    expect(navigation.goBack).not.toHaveBeenCalled();

    mockUseSchedules.mockReturnValue(
      buildScheduleHookState({
        schedules: [],
        hasLoaded: true,
      }),
    );

    view.rerender(
      <ScheduleDetailScreen
        route={{
          key: 'schedule-detail',
          name: 'ScheduleDetail',
          params: { scheduleId: 'missing' },
        }}
        navigation={navigation}
      />,
    );

    expect(navigation.goBack).toHaveBeenCalledTimes(1);
  });
});
