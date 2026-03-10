import './global.css';
import { StatusBar } from 'expo-status-bar';
import React from 'react';

import { DatabaseProvider } from '@core/database';
import { RootNavigator } from '@core/navigation';
import { ThemeProvider } from '@core/theme/theme-context';

export default function App(): React.JSX.Element {
  return (
    <ThemeProvider>
      <DatabaseProvider>
        <StatusBar style="light" />
        <RootNavigator />
      </DatabaseProvider>
    </ThemeProvider>
  );
}
