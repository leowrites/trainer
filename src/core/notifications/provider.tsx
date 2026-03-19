import React, { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';

import { Body, Heading, Surface } from '@shared/components';
import { useTheme } from '@core/theme/theme-context';
import { type AppNotification, useNotificationStore } from './store';

function getVariantStyles(
  notification: AppNotification,
  tokens: ReturnType<typeof useTheme>['tokens'],
): {
  backgroundColor: string;
  borderColor: string;
} {
  switch (notification.variant) {
    case 'success':
      return {
        backgroundColor: tokens.successSubtle,
        borderColor: tokens.successBorder,
      };
    case 'warning':
      return {
        backgroundColor: tokens.secondarySubtle,
        borderColor: tokens.secondaryBorder,
      };
    case 'error':
      return {
        backgroundColor: tokens.errorSubtle,
        borderColor: tokens.errorBorder,
      };
    case 'info':
    default:
      return {
        backgroundColor: tokens.accentSubtle,
        borderColor: tokens.accentBorder,
      };
  }
}

function NotificationCard({
  notification,
  onDismiss,
}: {
  notification: AppNotification;
  onDismiss: () => void;
}): React.JSX.Element {
  const { tokens } = useTheme();
  const variantStyles = getVariantStyles(notification, tokens);

  useEffect(() => {
    if (notification.durationMs === 0) {
      return undefined;
    }

    const timeout = setTimeout(() => {
      onDismiss();
    }, notification.durationMs);

    return () => clearTimeout(timeout);
  }, [notification.durationMs, onDismiss]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Dismiss notification: ${notification.title}`}
      className="mb-3"
      onPress={onDismiss}
    >
      <Surface
        variant="elevated"
        className="rounded-3xl border px-4 py-4"
        style={variantStyles}
      >
        <Heading className="text-base">{notification.title}</Heading>
        <Body className="mt-1 text-sm leading-5">{notification.message}</Body>
      </Surface>
    </Pressable>
  );
}

export function NotificationViewport(): React.JSX.Element | null {
  const insets = useSafeAreaInsets();
  const notifications = useNotificationStore(
    useShallow((state) => state.notifications),
  );
  const dismiss = useNotificationStore((state) => state.dismiss);

  if (notifications.length === 0) {
    return null;
  }

  return (
    <View
      pointerEvents="box-none"
      className="absolute left-0 right-0 z-50"
      style={{ top: insets.top + 12 }}
    >
      <View className="px-4">
        {notifications.map((notification) => (
          <NotificationCard
            key={notification.id}
            notification={notification}
            onDismiss={() => dismiss(notification.id)}
          />
        ))}
      </View>
    </View>
  );
}
