import { fireEvent, render, screen } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import React, { type ForwardedRef, type PropsWithChildren } from 'react';

import type { ScheduleEntry } from '@core/database/types';
import { RoutineDetailScreen } from '../screens/routine-detail-screen';
import { LibraryScreen } from '../screens/library-screen';
import { RoutinesScreen } from '../screens/routines-screen';
import { useScheduleEntryIndex, useSchedules } from '@features/schedule';
import { useExerciseInsight } from '../hooks/use-exercise-insight';
import { useExercises } from '../hooks/use-exercises';
import { useRoutineExerciseCounts } from '../hooks/use-routine-exercise-counts';
import { useRoutineInsight } from '../hooks/use-routine-insight';
import { useRoutineTemplate } from '../hooks/use-routine-template';
import { useRoutines } from '../hooks/use-routines';

void React;

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');

  return {
    ...actual,
    useFocusEffect: (callback: () => void) => callback(),
  };
});

jest.mock('@shared/hooks', () => ({
  useReducedMotionPreference: () => false,
}));

jest.mock('@react-navigation/elements', () => {
  const actual = jest.requireActual('@react-navigation/elements');

  return {
    ...actual,
    useHeaderHeight: () => 96,
  };
});

jest.mock('../hooks/use-exercises', () => ({
  useExercises: jest.fn(),
}));

jest.mock('../hooks/use-exercise-insight', () => ({
  useExerciseInsight: jest.fn(),
}));

jest.mock('../hooks/use-routine-exercise-counts', () => ({
  useRoutineExerciseCounts: jest.fn(),
}));

jest.mock('../hooks/use-routine-insight', () => ({
  useRoutineInsight: jest.fn(),
}));

jest.mock('../hooks/use-routine-template', () => ({
  useRoutineTemplate: jest.fn(),
}));

jest.mock('../hooks/use-routines', () => ({
  useRoutines: jest.fn(),
}));

jest.mock('@features/schedule', () => ({
  ScheduleDetailScreen: () => null,
  useSchedules: jest.fn(),
  buildScheduleSummary: (
    schedule: { id: string },
    entries: Array<{ routine_id: string }>,
  ) => ({
    schedule: { id: schedule.id },
    routineCount: entries.length,
    nextRoutineName: null,
  }),
  getActiveScheduleSummary: (
    schedules: Array<{ id: string; is_active: number }>,
    routines: Array<unknown>,
    entriesByScheduleId: Record<string, Array<{ routine_id: string }>>,
  ) => {
    const activeSchedule =
      schedules.find((schedule) => schedule.is_active === 1) ?? null;

    if (activeSchedule === null) {
      return null;
    }

    return {
      schedule: activeSchedule,
      routineCount: (entriesByScheduleId[activeSchedule.id] ?? []).length,
      nextRoutineName: null,
      entries: routines,
    };
  },
  getScheduleStatusText: () => 'Ready to start from the first routine.',
  useScheduleEntryIndex: jest.fn(),
}));

jest.mock('@lodev09/react-native-true-sheet', () => {
  const React = require('react');
  const ReactNative = require('react-native');

  return {
    TrueSheet: React.forwardRef(
      (
        { children, footer }: PropsWithChildren<{ footer?: React.ReactNode }>,
        ref: ForwardedRef<{
          present: () => Promise<void>;
          dismiss: () => Promise<void>;
        }>,
      ) => {
        React.useImperativeHandle(ref, () => ({
          present: async () => undefined,
          dismiss: async () => undefined,
        }));

        return (
          <ReactNative.View>
            {children}
            {footer}
          </ReactNative.View>
        );
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
      data: Array<{ exerciseId?: string }>;
      renderItem: (props: {
        item: { exerciseId?: string };
        drag: () => void;
        isActive: boolean;
        getIndex: () => number;
      }) => React.ReactNode;
      ListHeaderComponent?: React.ReactNode;
      ListFooterComponent?: React.ReactNode;
      ListEmptyComponent?: React.ReactNode;
      onDragEnd?: (params: {
        data: Array<{ exerciseId?: string }>;
        from: number;
        to: number;
      }) => void;
    }) => (
      <ReactNative.View>
        {ListHeaderComponent}
        {data.length === 0
          ? ListEmptyComponent
          : data.map((item, index) => (
              <ReactNative.View key={item.exerciseId}>
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
const mockUseScheduleEntryIndex = jest.mocked(useScheduleEntryIndex);
const mockUseExerciseInsight = jest.mocked(useExerciseInsight);
const mockUseExercises = jest.mocked(useExercises);
const mockUseRoutineExerciseCounts = jest.mocked(useRoutineExerciseCounts);
const mockUseRoutineInsight = jest.mocked(useRoutineInsight);
const mockUseRoutineTemplate = jest.mocked(useRoutineTemplate);
const mockUseRoutines = jest.mocked(useRoutines);

function buildSchedulesHookState(
  overrides: Partial<ReturnType<typeof useSchedules>> = {},
): ReturnType<typeof useSchedules> {
  return {
    schedules: [],
    hasLoaded: true,
    refresh: jest.fn(),
    createSchedule: jest.fn(),
    updateSchedule: jest.fn(),
    setActiveSchedule: jest.fn(),
    deleteSchedule: jest.fn(),
    ...overrides,
  };
}

function buildScheduleEntryIndexHookState(
  entriesByScheduleId: Record<string, ScheduleEntry[]> = {},
): ReturnType<typeof useScheduleEntryIndex> {
  return {
    entriesByScheduleId,
    refresh: jest.fn(),
  };
}

function buildRoutineExerciseCountsHookState(
  countsByRoutineId: Record<string, number> = {},
): ReturnType<typeof useRoutineExerciseCounts> {
  return {
    countsByRoutineId,
    refresh: jest.fn(),
  };
}

function buildRoutineTemplateHookState(
  template: ReturnType<typeof useRoutineTemplate>['template'] = [],
): ReturnType<typeof useRoutineTemplate> {
  return {
    template,
    isLoading: false,
    refresh: jest.fn(),
  };
}

function buildRoutineInsightHookState(
  insight: ReturnType<typeof useRoutineInsight>['insight'] = {
    completionCount: 4,
    lastPerformedAt: new Date('2026-03-12T12:00:00.000Z').getTime(),
    averageVolume: 5480,
    averageDurationMinutes: 52,
    recentSessions: [
      {
        sessionId: 'session-1',
        routineName: 'Push A',
        startTime: new Date('2026-03-12T12:00:00.000Z').getTime(),
        endTime: new Date('2026-03-12T12:52:00.000Z').getTime(),
        totalVolume: 5600,
        completedSets: 12,
        totalSets: 12,
      },
    ],
  },
): ReturnType<typeof useRoutineInsight> {
  return {
    insight,
    isLoading: false,
    refresh: jest.fn(),
  };
}

function buildExerciseInsightHookState(
  insight: ReturnType<typeof useExerciseInsight>['insight'] = {
    totalSessions: 2,
    lastPerformedAt: new Date('2026-03-10T12:00:00.000Z').getTime(),
    bestCompletedWeight: 185,
    history: [
      {
        sessionId: 'session-1',
        sessionName: 'Push A',
        startTime: new Date('2026-03-10T12:00:00.000Z').getTime(),
        bestCompletedWeight: 185,
        completedSets: 3,
        totalSets: 3,
        setSummary: '8 × 185 • 8 × 185 • 7 × 185',
      },
    ],
  },
): ReturnType<typeof useExerciseInsight> {
  return {
    insight,
    isLoading: false,
    refresh: jest.fn(),
  };
}

function buildRoutinesHookState(
  overrides: Partial<ReturnType<typeof useRoutines>> = {},
): ReturnType<typeof useRoutines> {
  return {
    routines: [],
    hasLoaded: true,
    refresh: jest.fn(),
    createRoutine: jest.fn(),
    updateRoutine: jest.fn(),
    deleteRoutine: jest.fn(),
    ...overrides,
  };
}

function renderScreen(): ReturnType<typeof render> {
  return render(
    <NavigationContainer>
      <RoutinesScreen />
    </NavigationContainer>,
  );
}

describe('RoutinesScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseSchedules.mockReturnValue(buildSchedulesHookState());
    mockUseScheduleEntryIndex.mockReturnValue(
      buildScheduleEntryIndexHookState(),
    );
    mockUseExerciseInsight.mockReturnValue(buildExerciseInsightHookState());
    mockUseRoutineExerciseCounts.mockReturnValue(
      buildRoutineExerciseCountsHookState(),
    );
    mockUseRoutineInsight.mockReturnValue(buildRoutineInsightHookState());
    mockUseRoutineTemplate.mockReturnValue(buildRoutineTemplateHookState());
  });

  it('creates a new exercise from the top-level create flow', () => {
    const refreshExercises = jest.fn();
    const refreshRoutines = jest.fn();
    const createExercise = jest.fn().mockReturnValue({
      id: 'exercise-created',
      name: 'Bench Press',
      muscle_group: 'Chest',
      how_to: 'Set your shoulders before every rep.',
      equipment: 'Barbell',
      is_deleted: 0,
    });

    mockUseExercises.mockReturnValue({
      exercises: [],
      hasLoaded: true,
      refresh: refreshExercises,
      createExercise,
      updateExercise: jest.fn(),
      deleteExercise: jest.fn(),
    });
    mockUseRoutines.mockReturnValue({
      ...buildRoutinesHookState(),
      refresh: refreshRoutines,
    });

    renderScreen();

    expect(refreshExercises).toHaveBeenCalledTimes(1);
    expect(refreshRoutines).toHaveBeenCalledTimes(1);
    expect(mockUseSchedules().refresh).toHaveBeenCalledTimes(1);

    fireEvent.press(screen.getByLabelText('exercises'));
    fireEvent.press(screen.getByText('New Exercise'));
    fireEvent.changeText(
      screen.getByPlaceholderText('Bench Press'),
      ' Bench Press ',
    );
    fireEvent.changeText(screen.getByPlaceholderText('Chest'), ' Chest ');
    fireEvent.changeText(
      screen.getByPlaceholderText('Barbell, bench'),
      ' Barbell ',
    );
    fireEvent.changeText(
      screen.getByPlaceholderText(
        'Short setup cues, execution notes, and safety reminders',
      ),
      ' Set your shoulders before every rep. ',
    );
    fireEvent.press(screen.getByLabelText('Save'));

    expect(createExercise).toHaveBeenCalledWith({
      name: 'Bench Press',
      muscleGroup: 'Chest',
      howTo: ' Set your shoulders before every rep. ',
      equipment: ' Barbell ',
    });
  });

  it('opens the exercise detail page with how-to and history', () => {
    mockUseExercises.mockReturnValue({
      exercises: [
        {
          id: 'exercise-1',
          name: 'Bench Press',
          muscle_group: 'Chest',
          how_to: 'Drive your feet and keep the bar path stacked.',
          equipment: 'Barbell',
          is_deleted: 0,
        },
      ],
      hasLoaded: true,
      refresh: jest.fn(),
      createExercise: jest.fn(),
      updateExercise: jest.fn(),
      deleteExercise: jest.fn(),
    });
    mockUseRoutines.mockReturnValue(buildRoutinesHookState());

    renderScreen();

    fireEvent.press(screen.getByLabelText('exercises'));
    fireEvent.press(screen.getByLabelText('Open Bench Press'));

    expect(screen.getByText('Edit Exercise')).toBeTruthy();
    expect(screen.getByText('How To')).toBeTruthy();
    expect(
      screen.getByText('Drive your feet and keep the bar path stacked.'),
    ).toBeTruthy();
    expect(screen.getByText('History')).toBeTruthy();
    expect(screen.getByText('8 × 185 • 8 × 185 • 7 × 185')).toBeTruthy();
  });

  it('renames the exercise editor action to archive', () => {
    mockUseExercises.mockReturnValue({
      exercises: [
        {
          id: 'exercise-1',
          name: 'Bench Press',
          muscle_group: 'Chest',
          how_to: 'Drive your feet and keep the bar path stacked.',
          equipment: 'Barbell',
          is_deleted: 0,
        },
      ],
      hasLoaded: true,
      refresh: jest.fn(),
      createExercise: jest.fn(),
      updateExercise: jest.fn(),
      deleteExercise: jest.fn(),
    });
    mockUseRoutines.mockReturnValue(buildRoutinesHookState());

    renderScreen();

    fireEvent.press(screen.getByLabelText('exercises'));
    fireEvent.press(screen.getByLabelText('Open Bench Press'));
    fireEvent.press(screen.getByText('Edit Exercise'));

    expect(screen.queryByText('Delete Exercise')).toBeNull();
    expect(screen.getByText('Archive Exercise')).toBeTruthy();
  });

  it('opens the routine detail page and saves reordered exercises', () => {
    const updateRoutine = jest.fn();

    mockUseExercises.mockReturnValue({
      exercises: [
        {
          id: 'exercise-1',
          name: 'Bench Press',
          muscle_group: 'Chest',
          how_to: null,
          equipment: null,
          is_deleted: 0,
        },
        {
          id: 'exercise-2',
          name: 'Overhead Press',
          muscle_group: 'Shoulders',
          how_to: null,
          equipment: null,
          is_deleted: 0,
        },
      ],
      hasLoaded: true,
      refresh: jest.fn(),
      createExercise: jest.fn(),
      updateExercise: jest.fn(),
      deleteExercise: jest.fn(),
    });
    mockUseRoutines.mockReturnValue(
      buildRoutinesHookState({
        routines: [{ id: 'routine-1', name: 'Push A', notes: null }],
        updateRoutine,
      }),
    );
    mockUseRoutineExerciseCounts.mockReturnValue(
      buildRoutineExerciseCountsHookState({
        'routine-1': 2,
      }),
    );
    mockUseRoutineTemplate.mockReturnValue(
      buildRoutineTemplateHookState([
        {
          id: 'routine-exercise-1',
          exerciseId: 'exercise-1',
          position: 0,
          restSeconds: null,
          progressionPolicy: 'double_progression',
          targetRir: null,
          targetSets: 3,
          targetReps: 10,
          targetRepsMin: 10,
          targetRepsMax: 10,
          sets: Array.from({ length: 3 }, (_, index) => ({
            id: `set-${index + 1}`,
            position: index,
            targetReps: 10,
            targetRepsMin: 10,
            targetRepsMax: 10,
            plannedWeight: null,
            setRole: 'work',
          })),
        },
        {
          id: 'routine-exercise-2',
          exerciseId: 'exercise-2',
          position: 1,
          restSeconds: null,
          progressionPolicy: 'double_progression',
          targetRir: null,
          targetSets: 4,
          targetReps: 8,
          targetRepsMin: 8,
          targetRepsMax: 8,
          sets: Array.from({ length: 4 }, (_, index) => ({
            id: `set-b-${index + 1}`,
            position: index,
            targetReps: 8,
            targetRepsMin: 8,
            targetRepsMax: 8,
            plannedWeight: null,
            setRole: 'work',
          })),
        },
      ]),
    );

    renderScreen();

    fireEvent.press(screen.getByLabelText('routines'));
    fireEvent.press(screen.getByLabelText('Open Push A'));
    fireEvent(screen.getByLabelText('Reorder Overhead Press'), 'onLongPress');
    fireEvent.press(screen.getByLabelText('Save'));

    expect(screen.getByText('Progression')).toBeTruthy();
    expect(updateRoutine).toHaveBeenCalledWith('routine-1', {
      name: 'Push A',
      exercises: [
        {
          exerciseId: 'exercise-2',
          restSeconds: null,
          progressionPolicy: 'double_progression',
          targetRir: null,
          sets: [
            {
              targetRepsMin: 8,
              targetRepsMax: 8,
              plannedWeight: null,
              setRole: 'work',
            },
            {
              targetRepsMin: 8,
              targetRepsMax: 8,
              plannedWeight: null,
              setRole: 'work',
            },
            {
              targetRepsMin: 8,
              targetRepsMax: 8,
              plannedWeight: null,
              setRole: 'work',
            },
            {
              targetRepsMin: 8,
              targetRepsMax: 8,
              plannedWeight: null,
              setRole: 'work',
            },
          ],
        },
        {
          exerciseId: 'exercise-1',
          restSeconds: null,
          progressionPolicy: 'double_progression',
          targetRir: null,
          sets: [
            {
              targetRepsMin: 10,
              targetRepsMax: 10,
              plannedWeight: null,
              setRole: 'work',
            },
            {
              targetRepsMin: 10,
              targetRepsMax: 10,
              plannedWeight: null,
              setRole: 'work',
            },
            {
              targetRepsMin: 10,
              targetRepsMax: 10,
              plannedWeight: null,
              setRole: 'work',
            },
          ],
        },
      ],
    });
  });

  it('renames the routine editor action to archive', () => {
    mockUseExercises.mockReturnValue({
      exercises: [
        {
          id: 'exercise-1',
          name: 'Bench Press',
          muscle_group: 'Chest',
          how_to: null,
          equipment: null,
          is_deleted: 0,
        },
      ],
      hasLoaded: true,
      refresh: jest.fn(),
      createExercise: jest.fn(),
      updateExercise: jest.fn(),
      deleteExercise: jest.fn(),
    });
    mockUseRoutines.mockReturnValue(
      buildRoutinesHookState({
        routines: [{ id: 'routine-1', name: 'Push A', notes: null }],
      }),
    );
    mockUseRoutineExerciseCounts.mockReturnValue(
      buildRoutineExerciseCountsHookState({
        'routine-1': 1,
      }),
    );
    mockUseRoutineTemplate.mockReturnValue(
      buildRoutineTemplateHookState([
        {
          id: 'routine-exercise-1',
          exerciseId: 'exercise-1',
          position: 0,
          restSeconds: null,
          progressionPolicy: 'double_progression',
          targetRir: null,
          targetSets: 3,
          targetReps: 10,
          targetRepsMin: 10,
          targetRepsMax: 10,
          sets: Array.from({ length: 3 }, (_, index) => ({
            id: `set-${index + 1}`,
            position: index,
            targetReps: 10,
            targetRepsMin: 10,
            targetRepsMax: 10,
            plannedWeight: null,
            setRole: 'work',
          })),
        },
      ]),
    );

    renderScreen();

    fireEvent.press(screen.getByLabelText('routines'));
    fireEvent.press(screen.getByLabelText('Open Push A'));

    expect(screen.queryByText('Delete Routine')).toBeNull();
    expect(screen.getByText('Archive Routine')).toBeTruthy();
  });

  it('adds multiple exercises to a routine before saving', () => {
    const updateRoutine = jest.fn();

    mockUseExercises.mockReturnValue({
      exercises: [
        {
          id: 'exercise-1',
          name: 'Bench Press',
          muscle_group: 'Chest',
          how_to: null,
          equipment: null,
          is_deleted: 0,
        },
        {
          id: 'exercise-2',
          name: 'Overhead Press',
          muscle_group: 'Shoulders',
          how_to: null,
          equipment: null,
          is_deleted: 0,
        },
        {
          id: 'exercise-3',
          name: 'Incline Dumbbell Press',
          muscle_group: 'Chest',
          how_to: null,
          equipment: null,
          is_deleted: 0,
        },
      ],
      hasLoaded: true,
      refresh: jest.fn(),
      createExercise: jest.fn(),
      updateExercise: jest.fn(),
      deleteExercise: jest.fn(),
    });
    mockUseRoutines.mockReturnValue(
      buildRoutinesHookState({
        routines: [{ id: 'routine-1', name: 'Push A', notes: null }],
        updateRoutine,
      }),
    );
    mockUseRoutineExerciseCounts.mockReturnValue(
      buildRoutineExerciseCountsHookState({
        'routine-1': 0,
      }),
    );

    renderScreen();

    fireEvent.press(screen.getByLabelText('routines'));
    fireEvent.press(screen.getByLabelText('Open Push A'));
    fireEvent.press(screen.getByText('Add Exercise'));
    fireEvent.press(screen.getByLabelText('Add Bench Press to routine'));
    fireEvent.press(
      screen.getByLabelText('Add Incline Dumbbell Press to routine'),
    );
    fireEvent.press(screen.getByText('Add Selected'));
    fireEvent.press(screen.getByLabelText('Save'));

    expect(updateRoutine).toHaveBeenCalledWith('routine-1', {
      name: 'Push A',
      exercises: [
        {
          exerciseId: 'exercise-1',
          restSeconds: null,
          progressionPolicy: 'double_progression',
          targetRir: null,
          sets: [
            {
              targetRepsMin: 10,
              targetRepsMax: 10,
              plannedWeight: null,
              setRole: 'work',
            },
          ],
        },
        {
          exerciseId: 'exercise-3',
          restSeconds: null,
          progressionPolicy: 'double_progression',
          targetRir: null,
          sets: [
            {
              targetRepsMin: 10,
              targetRepsMax: 10,
              plannedWeight: null,
              setRole: 'work',
            },
          ],
        },
      ],
    });
  });

  it('waits for routines to load before leaving routine detail', () => {
    const goBack = jest.fn();
    const setOptions = jest.fn();

    mockUseExercises.mockReturnValue({
      exercises: [],
      hasLoaded: true,
      refresh: jest.fn(),
      createExercise: jest.fn(),
      updateExercise: jest.fn(),
      deleteExercise: jest.fn(),
    });

    mockUseRoutines.mockReturnValue(
      buildRoutinesHookState({
        routines: [],
        hasLoaded: false,
      }),
    );

    const view = render(
      <NavigationContainer>
        <RoutineDetailScreen
          route={{
            key: 'routine-detail',
            name: 'RoutineDetail',
            params: { routineId: 'routine-1' },
          }}
          navigation={{ goBack, setOptions } as never}
        />
      </NavigationContainer>,
    );

    expect(goBack).not.toHaveBeenCalled();

    mockUseRoutines.mockReturnValue(
      buildRoutinesHookState({
        routines: [{ id: 'routine-1', name: 'Push A', notes: null }],
      }),
    );
    mockUseRoutineExerciseCounts.mockReturnValue(
      buildRoutineExerciseCountsHookState({
        'routine-1': 0,
      }),
    );

    view.rerender(
      <NavigationContainer>
        <RoutineDetailScreen
          route={{
            key: 'routine-detail',
            name: 'RoutineDetail',
            params: { routineId: 'routine-1' },
          }}
          navigation={{ goBack, setOptions } as never}
        />
      </NavigationContainer>,
    );

    expect(goBack).not.toHaveBeenCalled();
    expect(screen.getByText('Template exercises')).toBeTruthy();
    expect(setOptions).toHaveBeenCalledWith({ title: 'Push A' });
  });

  it('opens library exercise details through the local plan stack', () => {
    const localNavigate = jest.fn();
    const rootNavigate = jest.fn();

    mockUseExercises.mockReturnValue({
      exercises: [
        {
          id: 'exercise-1',
          name: 'Bench Press',
          muscle_group: 'Chest',
          how_to: null,
          equipment: null,
          is_deleted: 0,
        },
      ],
      hasLoaded: true,
      refresh: jest.fn(),
      createExercise: jest.fn(),
      updateExercise: jest.fn(),
      deleteExercise: jest.fn(),
    });
    mockUseRoutines.mockReturnValue(buildRoutinesHookState());

    render(
      <LibraryScreen
        route={{ key: 'library', name: 'Library' } as never}
        navigation={
          {
            navigate: localNavigate,
            getParent: () => ({
              getParent: () => ({
                navigate: rootNavigate,
              }),
            }),
          } as never
        }
      />,
    );

    fireEvent.press(screen.getByLabelText('exercises'));
    fireEvent.press(screen.getByLabelText('Open Bench Press'));

    expect(localNavigate).toHaveBeenCalledWith('ExerciseDetail', {
      exerciseId: 'exercise-1',
    });
    expect(rootNavigate).not.toHaveBeenCalled();
  });

  it('opens library routine details through the local plan stack', () => {
    const localNavigate = jest.fn();
    const rootNavigate = jest.fn();

    mockUseExercises.mockReturnValue({
      exercises: [],
      hasLoaded: true,
      refresh: jest.fn(),
      createExercise: jest.fn(),
      updateExercise: jest.fn(),
      deleteExercise: jest.fn(),
    });
    mockUseRoutines.mockReturnValue(
      buildRoutinesHookState({
        routines: [{ id: 'routine-1', name: 'Push A', notes: null }],
      }),
    );
    mockUseRoutineExerciseCounts.mockReturnValue(
      buildRoutineExerciseCountsHookState({
        'routine-1': 0,
      }),
    );

    render(
      <LibraryScreen
        route={{ key: 'library', name: 'Library' } as never}
        navigation={
          {
            navigate: localNavigate,
            getParent: () => ({
              getParent: () => ({
                navigate: rootNavigate,
              }),
            }),
          } as never
        }
      />,
    );

    fireEvent.press(screen.getByLabelText('routines'));
    fireEvent.press(screen.getByLabelText('Open Push A'));

    expect(localNavigate).toHaveBeenCalledWith('RoutineDetail', {
      routineId: 'routine-1',
    });
    expect(rootNavigate).not.toHaveBeenCalled();
  });
});
