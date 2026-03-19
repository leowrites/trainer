import { create } from 'zustand';

export type AppNotificationVariant = 'info' | 'success' | 'warning' | 'error';

export interface AppNotificationInput {
  title: string;
  message: string;
  variant?: AppNotificationVariant;
  durationMs?: number;
}

export interface AppNotification extends AppNotificationInput {
  id: string;
  variant: AppNotificationVariant;
  durationMs: number;
  createdAt: number;
}

interface NotificationState {
  notifications: AppNotification[];
}

interface NotificationActions {
  notify: (input: AppNotificationInput) => string;
  dismiss: (id: string) => void;
  clearAll: () => void;
}

type NotificationStore = NotificationState & NotificationActions;

export const DEFAULT_NOTIFICATION_DURATION_MS = 4_000;

function createNotificationId(): string {
  return `notification-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export const useNotificationStore = create<NotificationStore>((set) => ({
  notifications: [],

  notify: (input): string => {
    const notification: AppNotification = {
      id: createNotificationId(),
      title: input.title.trim(),
      message: input.message.trim(),
      variant: input.variant ?? 'info',
      durationMs:
        typeof input.durationMs === 'number' && input.durationMs >= 0
          ? input.durationMs
          : DEFAULT_NOTIFICATION_DURATION_MS,
      createdAt: Date.now(),
    };

    set((state) => ({
      notifications: [...state.notifications, notification],
    }));

    return notification.id;
  },

  dismiss: (id): void => {
    set((state) => ({
      notifications: state.notifications.filter(
        (notification) => notification.id !== id,
      ),
    }));
  },

  clearAll: (): void => {
    set({ notifications: [] });
  },
}));
