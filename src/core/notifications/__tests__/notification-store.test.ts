import {
  DEFAULT_NOTIFICATION_DURATION_MS,
  useNotificationStore,
} from '../store';

describe('useNotificationStore', () => {
  beforeEach(() => {
    useNotificationStore.getState().clearAll();
  });

  it('enqueues notifications with sensible defaults', () => {
    jest.spyOn(Date, 'now').mockReturnValue(1_234);

    const id = useNotificationStore.getState().notify({
      title: ' Rest timer complete ',
      message: ' Workout ready ',
    });

    expect(id).toMatch(/^notification-/);
    expect(useNotificationStore.getState().notifications).toEqual([
      {
        id,
        title: 'Rest timer complete',
        message: 'Workout ready',
        variant: 'info',
        durationMs: DEFAULT_NOTIFICATION_DURATION_MS,
        createdAt: 1_234,
      },
    ]);

    jest.restoreAllMocks();
  });

  it('dismisses a single notification without clearing the queue', () => {
    const firstId = useNotificationStore.getState().notify({
      title: 'First',
      message: 'One',
      durationMs: 0,
    });
    useNotificationStore.getState().notify({
      title: 'Second',
      message: 'Two',
      durationMs: 0,
    });

    useNotificationStore.getState().dismiss(firstId);

    expect(useNotificationStore.getState().notifications).toHaveLength(1);
    expect(useNotificationStore.getState().notifications[0]?.title).toBe(
      'Second',
    );
  });
});
