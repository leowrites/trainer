/**
 * EditorSheet
 *
 * CALLING SPEC:
 * - render a reusable TrueSheet-backed editor surface
 * - manage present/dismiss lifecycle from a simple `visible` prop
 * - provide a shared scrollable content area with optional footer actions
 * - side effects: presents and dismisses the native sheet instance
 */

import { TrueSheet } from '@lodev09/react-native-true-sheet';
import React, { useEffect, useRef, useState } from 'react';
import { ScrollView } from 'react-native';

import { useTheme } from '@core/theme/theme-context';

export interface EditorSheetProps {
  visible: boolean;
  onClose: () => void;
  onDidDismiss?: () => void;
  footer?: React.ReactElement | null;
  children: React.ReactNode;
}

export function EditorSheet({
  visible,
  onClose,
  onDidDismiss,
  footer,
  children,
}: EditorSheetProps): React.JSX.Element | null {
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
      detents={[0.5, 1]}
      cornerRadius={28}
      grabber
      scrollable
      backgroundColor={tokens.bgBase}
      footer={footer ?? undefined}
      backgroundBlur={colorMode === 'dark' ? 'dark' : 'light'}
      onDidPresent={() => {
        isPresentedRef.current = true;
        isTransitioningRef.current = false;
      }}
      onDidDismiss={() => {
        isPresentedRef.current = false;
        isTransitioningRef.current = false;
        setShouldRender(false);
        onDidDismiss?.();

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
