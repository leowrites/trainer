import './global.css';
import { StatusBar } from 'expo-status-bar';
import React from 'react';

import { DatabaseProvider } from '@core/database';
import { RootNavigator } from '@core/navigation';
import { ThemeProvider, useTheme } from '@core/theme/theme-context';

/**
 * Renders a `StatusBar` whose style tracks the active colour mode.
 * Must be rendered inside `ThemeProvider`.
 */
function ThemedStatusBar(): React.JSX.Element {
  const { colorMode } = useTheme();
  return <StatusBar style={colorMode === 'dark' ? 'light' : 'dark'} />;
}

export default function App(): React.JSX.Element {
  return (
    <ThemeProvider>
      <DatabaseProvider>
        <ThemedStatusBar />
        <RootNavigator />
      </DatabaseProvider>
    </ThemeProvider>
  );
}
