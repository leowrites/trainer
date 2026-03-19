import { useNotificationStore, type AppNotificationInput } from './store';

export function useNotifier(): (input: AppNotificationInput) => string {
  return useNotificationStore((state) => state.notify);
}
