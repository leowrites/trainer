import { act, renderHook, waitFor } from '@testing-library/react-native';
import { AccessibilityInfo, type EmitterSubscription } from 'react-native';

import { useReducedMotionPreference } from '../use-reduced-motion-preference';

describe('useReducedMotionPreference', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('shares a single listener and reacts to updates', async () => {
    const remove = jest.fn();
    let changeHandler: ((isEnabled: boolean) => void) | null = null;

    jest
      .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
      .mockResolvedValue(true);
    jest.spyOn(AccessibilityInfo, 'addEventListener').mockImplementation(((
      eventName: string,
      listener: unknown,
    ) => {
      if (eventName === 'reduceMotionChanged') {
        changeHandler = listener as (isEnabled: boolean) => void;
      }

      return { remove } as unknown as EmitterSubscription;
    }) as typeof AccessibilityInfo.addEventListener);

    const { result, unmount } = renderHook(() => ({
      primary: useReducedMotionPreference(),
      secondary: useReducedMotionPreference(),
    }));

    await waitFor(() => {
      expect(result.current.primary).toBe(true);
      expect(result.current.secondary).toBe(true);
    });

    expect(AccessibilityInfo.isReduceMotionEnabled).toHaveBeenCalledTimes(1);
    expect(AccessibilityInfo.addEventListener).toHaveBeenCalledTimes(1);

    act(() => {
      changeHandler?.(false);
    });

    expect(result.current.primary).toBe(false);
    expect(result.current.secondary).toBe(false);

    unmount();

    expect(remove).toHaveBeenCalledTimes(1);
  });

  it('guards cleanup when no native subscription is returned', async () => {
    jest
      .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
      .mockResolvedValue(false);
    jest
      .spyOn(AccessibilityInfo, 'addEventListener')
      .mockReturnValue(undefined as unknown as EmitterSubscription);

    const { result, unmount } = renderHook(() => useReducedMotionPreference());

    await waitFor(() => {
      expect(result.current).toBe(false);
    });

    expect(() => {
      unmount();
    }).not.toThrow();
  });

  it('falls back to false when the platform lookup fails', async () => {
    jest
      .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
      .mockRejectedValue(new Error('unsupported'));
    jest.spyOn(AccessibilityInfo, 'addEventListener').mockReturnValue({
      remove: jest.fn(),
    } as unknown as EmitterSubscription);

    const { result } = renderHook(() => useReducedMotionPreference());

    await waitFor(() => {
      expect(result.current).toBe(false);
    });
  });
});
