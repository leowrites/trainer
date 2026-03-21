import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

import { triggerInteractionFeedback } from '../interaction-feedback';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn().mockResolvedValue(undefined),
  selectionAsync: jest.fn().mockResolvedValue(undefined),
  ImpactFeedbackStyle: {
    Light: 'light',
  },
}));

describe('triggerInteractionFeedback', () => {
  const originalPlatform = Platform.OS;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: originalPlatform,
    });
    jest.restoreAllMocks();
  });

  it('triggers native haptics for supported intents', () => {
    const impactAsync = jest.spyOn(Haptics, 'impactAsync');
    const selectionAsync = jest.spyOn(Haptics, 'selectionAsync');

    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: 'ios',
    });

    triggerInteractionFeedback('set-log');
    triggerInteractionFeedback('set-unlog');

    expect(impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
    expect(selectionAsync).toHaveBeenCalledTimes(1);
  });

  it('does not trigger haptics on web', () => {
    const impactAsync = jest.spyOn(Haptics, 'impactAsync');
    const selectionAsync = jest.spyOn(Haptics, 'selectionAsync');

    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: 'web',
    });

    triggerInteractionFeedback('set-log');

    expect(impactAsync).not.toHaveBeenCalled();
    expect(selectionAsync).not.toHaveBeenCalled();
  });
});
