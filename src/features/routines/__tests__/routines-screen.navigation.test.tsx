import { render } from '@testing-library/react-native';
import React from 'react';

const mockStackScreen = jest.fn();

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

jest.mock('@features/schedule', () => ({
  ScheduleDetailScreen: () => null,
}));

jest.mock('../screens/exercise-detail-screen', () => ({
  ExerciseDetailScreen: () => null,
}));

jest.mock('../screens/exercise-editor-screen', () => ({
  ExerciseEditorScreen: () => null,
}));

jest.mock('../screens/library-screen', () => ({
  LibraryScreen: () => null,
}));

jest.mock('../screens/routine-detail-screen', () => ({
  RoutineDetailScreen: () => null,
}));

jest.mock('../screens/routine-editor-screen', () => ({
  RoutineEditorScreen: () => null,
}));

import { RoutinesScreen } from '../screens/routines-screen';

type ScreenProps = {
  name: string;
  options?: {
    presentation?: string;
    headerShown?: boolean;
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

describe('RoutinesScreen navigation', () => {
  beforeEach(() => {
    mockStackScreen.mockClear();
  });

  it('registers routine and exercise detail routes as modal screens', () => {
    render(<RoutinesScreen />);

    expect(getScreen('ExerciseDetail').options).toMatchObject({
      headerShown: true,
      presentation: 'modal',
    });
    expect(getScreen('RoutineDetail').options).toMatchObject({
      headerShown: true,
      presentation: 'modal',
    });
    expect(getScreen('ScheduleDetail').options).toMatchObject({
      headerShown: true,
      presentation: 'modal',
    });
  });
});
