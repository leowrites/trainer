import { render } from '@testing-library/react-native';
import React from 'react';

const mockStackScreen = jest.fn();

jest.mock('@react-navigation/native-stack', () => ({
  createNativeStackNavigator: () => ({
    Navigator: ({ children }: { children?: unknown }) => children ?? null,
    Screen: (props: unknown) => {
      mockStackScreen(props);
      return null;
    },
  }),
}));

jest.mock('../screens/history-screen', () => ({
  HistoryScreen: () => null,
}));

jest.mock('../screens/history-session-detail-screen', () => ({
  HistorySessionDetailScreen: () => null,
}));

import { HistoryNavigator } from '../screens/history-navigator';

type ScreenProps = {
  name: string;
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

describe('HistoryNavigator', () => {
  beforeEach(() => {
    mockStackScreen.mockClear();
  });

  it('registers the session detail route as a modal screen', () => {
    render(<HistoryNavigator />);

    expect(getScreen('HistorySessionDetail').options).toMatchObject({
      headerShown: true,
      title: '',
      presentation: 'modal',
    });
  });
});
