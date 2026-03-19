import React from 'react';

import { useTheme } from '@core/theme/theme-context';
import { GluestackUIProvider as GeneratedGluestackUIProvider } from '@shared/ui/gluestack-ui-provider';

import type { GluestackColorConfig } from './gluestack-theme';
import { createGluestackColorConfig } from './gluestack-theme';

const GluestackContext = React.createContext<GluestackColorConfig | null>(null);

export function useGluestackConfig(): GluestackColorConfig {
  const contextValue = React.useContext(GluestackContext);
  if (!contextValue) {
    throw new Error(
      'useGluestackConfig must be used within GluestackUIProvider',
    );
  }
  return contextValue;
}

export function GluestackUIProvider({
  children,
}: React.PropsWithChildren<unknown>): React.ReactElement {
  const { tokens, colorMode } = useTheme();
  const config = React.useMemo(
    () => createGluestackColorConfig(tokens),
    [tokens],
  );

  return (
    <GluestackContext.Provider value={config}>
      <GeneratedGluestackUIProvider
        key={colorMode}
        mode={colorMode}
        style={config}
      >
        {children}
      </GeneratedGluestackUIProvider>
    </GluestackContext.Provider>
  );
}
