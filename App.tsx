import './global.css';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { DatabaseProvider } from '@core/database';
import { RootNavigator } from '@core/navigation';
import { WorkoutTimerNotificationCoordinator } from '@core/notifications';
import { isPerfLabEnabled } from '@core/performance';
import { PerfLabScreen } from '@core/performance/screens/perf-lab-screen';
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
  const perfLabEnabled = isPerfLabEnabled();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <GluestackUIProvider>
            <DatabaseProvider>
              <ThemedStatusBar />
              {perfLabEnabled ? <PerfLabScreen /> : <RootNavigator />}
              <WorkoutTimerNotificationCoordinator />
            </DatabaseProvider>
          </GluestackUIProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
