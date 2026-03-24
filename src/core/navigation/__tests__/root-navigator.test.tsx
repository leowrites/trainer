import { render } from '@testing-library/react-native';
import React from 'react';

import { buildProfilerCapture } from '@core/performance/testing';

const mockStackScreen = jest.fn();
const mockBottomTabScreen = jest.fn();
const mockNativeTabScreen = jest.fn();
const MockHistoryNavigator = (): null => null;

jest.mock('@react-navigation/native-stack', () => {
  return {
    createNativeStackNavigator: () => ({
      Navigator: ({ children }: { children?: unknown }) => children ?? null,
      Screen: (props: unknown) => {
        mockStackScreen(props);
        return null;
      },
    }),
  };
});

jest.mock('@react-navigation/bottom-tabs', () => {
  return {
    createBottomTabNavigator: () => ({
      Navigator: ({ children }: { children?: unknown }) => children ?? null,
      Screen: (props: unknown) => {
        mockBottomTabScreen(props);
        return null;
      },
    }),
  };
});

jest.mock('@react-navigation/bottom-tabs/unstable', () => {
  return {
    createNativeBottomTabNavigator: () => ({
      Navigator: ({ children }: { children?: unknown }) => children ?? null,
      Screen: (props: unknown) => {
        mockNativeTabScreen(props);
        return null;
      },
    }),
  };
});

jest.mock('@react-navigation/native', () => ({
  DefaultTheme: {
    colors: {
      primary: '#000',
      background: '#000',
      card: '#000',
      text: '#000',
      border: '#000',
      notification: '#000',
    },
  },
  createNavigationContainerRef: () => ({
    isReady: () => false,
    navigate: jest.fn(),
  }),
  NavigationContainer: ({ children }: { children?: unknown }) =>
    children ?? null,
}));

jest.mock('@features/analytics', () => ({
  HistoryNavigator: MockHistoryNavigator,
}));

jest.mock('@features/health-tracking', () => ({
  ProfileScreen: () => null,
}));

jest.mock('@features/routines', () => ({
  ExerciseDetailScreen: () => null,
  ExerciseEditorScreen: () => null,
  RoutineDetailScreen: () => null,
  RoutineEditorScreen: () => null,
  RoutinesScreen: () => null,
}));

jest.mock('@features/workout-mode', () => ({
  WorkoutActiveScreen: () => null,
  WorkoutScreen: () => null,
}));

jest.mock('@features/workout-mode/store', () => ({
  useWorkoutStore: () => ({
    isWorkoutActive: false,
    isWorkoutCollapsed: false,
    activeSession: null,
    expandWorkout: jest.fn(),
  }),
}));

jest.mock('@core/theme/theme-context', () => ({
  useTheme: () => ({
    tokens: {
      accent: '#0f0',
      bgBase: '#111',
      bgCard: '#222',
      textPrimary: '#fff',
      bgBorder: '#333',
      secondary: '#09f',
      textMuted: '#666',
    },
  }),
}));

jest.mock('zustand/react/shallow', () => ({
  useShallow: <T,>(selector: T) => selector,
}));

import { RootNavigator } from '../root-navigator';

type ScreenProps = {
  name: string;
  component?: unknown;
  options?: {
    presentation?: string;
    headerShown?: boolean;
    title?: string;
  };
};

function getScreen(name: string): ScreenProps {
  const screen = mockStackScreen.mock.calls
    .map(([props]) => props as ScreenProps)
    .find((props) => props.name === name);

  if (!screen) {
    throw new Error(`Expected screen ${name} to be registered`);
  }

  return screen;
}

function getTabScreen(name: string): ScreenProps {
  const screen = [
    ...mockBottomTabScreen.mock.calls,
    ...mockNativeTabScreen.mock.calls,
  ]
    .map(([props]) => props as ScreenProps)
    .find((props) => props.name === name);

  if (!screen) {
    throw new Error(`Expected tab screen ${name} to be registered`);
  }

  return screen;
}

describe('RootNavigator', () => {
  beforeEach(() => {
    mockStackScreen.mockClear();
    mockBottomTabScreen.mockClear();
    mockNativeTabScreen.mockClear();
  });

  it('registers exercise and routine detail and editor routes as modal screens', () => {
    render(<RootNavigator />);

    expect(getScreen('ExerciseDetail').options).toMatchObject({
      headerShown: true,
      title: '',
      presentation: 'modal',
    });
    expect(getScreen('ExerciseEditor').options).toMatchObject({
      headerShown: true,
      title: '',
      presentation: 'modal',
    });
    expect(getScreen('RoutineDetail').options).toMatchObject({
      headerShown: true,
      title: '',
      presentation: 'modal',
    });
    expect(getScreen('RoutineEditor').options).toMatchObject({
      headerShown: true,
      title: '',
      presentation: 'modal',
    });
  });

  it('mounts the history tab with the dedicated history navigator', () => {
    render(<RootNavigator />);

    const tabsScreen = getScreen('Tabs');
    const TabNavigatorComponent = tabsScreen.component as React.ComponentType<{
      navigation: unknown;
    }>;

    render(<TabNavigatorComponent navigation={{ navigate: jest.fn() }} />);

    expect(getTabScreen('History').name).toBe('History');
  });

  it('keeps root navigator mount within a minimal commit budget', () => {
    const capture = buildProfilerCapture('RootNavigator');

    render(
      <capture.Harness>
        <RootNavigator />
      </capture.Harness>,
    );

    expect(capture.commits().length).toBeLessThanOrEqual(1);
  });
});
