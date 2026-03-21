import { act, renderHook, waitFor } from '@testing-library/react-native';
import { AccessibilityInfo, type EmitterSubscription } from 'react-native';

import { useReducedMotionPreference } from '../use-reduced-motion-preference';

describe('useReducedMotionPreference', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('loads the initial reduce-motion setting and reacts to updates', async () => {
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

    const { result, unmount } = renderHook(() => useReducedMotionPreference());

    await waitFor(() => {
      expect(result.current).toBe(true);
    });

    act(() => {
      changeHandler?.(false);
    });

    expect(result.current).toBe(false);

    unmount();

    expect(remove).toHaveBeenCalledTimes(1);
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
