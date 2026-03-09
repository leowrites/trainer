import './global.css';
import { StatusBar } from 'expo-status-bar';
import React from 'react';

import { DatabaseProvider } from '@core/database/provider';
import { RootNavigator } from '@core/navigation';

export default function App(): React.JSX.Element {
  return (
    <DatabaseProvider>
      <StatusBar style="light" />
      <RootNavigator />
    </DatabaseProvider>
  );
}
