import { TrueSheet } from '@lodev09/react-native-true-sheet';
import React, { useEffect, useRef, useState } from 'react';
import { ScrollView } from 'react-native';

import { useTheme } from '@core/theme/theme-context';

export function EditorSheet({
  visible,
  onClose,
  children,
}: React.PropsWithChildren<{
  visible: boolean;
  onClose: () => void;
}>): React.JSX.Element | null {
  const { colorMode, tokens } = useTheme();
  const sheetRef = useRef<TrueSheet>(null);
  const latestVisibleRef = useRef(visible);
  const isPresentedRef = useRef(false);
  const isTransitioningRef = useRef(false);
  const [shouldRender, setShouldRender] = useState(visible);

  useEffect(() => {
    latestVisibleRef.current = visible;
  }, [visible]);

  useEffect(() => {
    if (visible) {
      setShouldRender(true);
    }
  }, [visible]);

  useEffect(() => {
    if (!shouldRender) {
      return;
    }

    if (visible) {
      if (isPresentedRef.current || isTransitioningRef.current) {
        return;
      }

      isTransitioningRef.current = true;
      void sheetRef.current?.present().catch(() => {
        isTransitioningRef.current = false;
      });
      return;
    }

    if (!isPresentedRef.current || isTransitioningRef.current) {
      setShouldRender(false);
      return;
    }

    isTransitioningRef.current = true;
    void sheetRef.current?.dismiss().catch(() => {
      isTransitioningRef.current = false;
      setShouldRender(false);
    });
  }, [shouldRender, visible]);

  if (!shouldRender) {
    return null;
  }

  return (
    <TrueSheet
      ref={sheetRef}
      detents={['auto', 1]}
      cornerRadius={28}
      grabber
      scrollable
      backgroundColor={tokens.bgBase}
      backgroundBlur={colorMode === 'dark' ? 'dark' : 'light'}
      onDidPresent={() => {
        isPresentedRef.current = true;
        isTransitioningRef.current = false;
      }}
      onDidDismiss={() => {
        isPresentedRef.current = false;
        isTransitioningRef.current = false;
        setShouldRender(false);

        if (latestVisibleRef.current) {
          onClose();
        }
      }}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: 32,
        }}
      >
        {children}
      </ScrollView>
    </TrueSheet>
  );
}
