import './global.css';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { DatabaseProvider } from '@core/database';
import { RootNavigator } from '@core/navigation';
import { ThemeProvider, useTheme } from '@core/theme/theme-context';
import { GluestackUIProvider } from '@shared/components';

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
    <SafeAreaProvider>
      <ThemeProvider colorMode="light">
        <GluestackUIProvider>
          <DatabaseProvider>
            <ThemedStatusBar />
            <RootNavigator />
          </DatabaseProvider>
        </GluestackUIProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
