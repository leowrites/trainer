import { getPressFeedbackStyle } from '../press-feedback';

describe('getPressFeedbackStyle', () => {
  it('does not override styles while idle', () => {
    expect(
      getPressFeedbackStyle({
        pressed: false,
        prefersReducedMotion: false,
      }),
    ).toEqual({});
  });

  it('applies opacity only when reduced motion is preferred', () => {
    expect(
      getPressFeedbackStyle({
        pressed: true,
        prefersReducedMotion: true,
        pressedOpacity: 0.9,
      }),
    ).toEqual({ opacity: 0.9 });
  });

  it('applies opacity and scale while pressed when motion is allowed', () => {
    expect(
      getPressFeedbackStyle({
        pressed: true,
        prefersReducedMotion: false,
        pressedOpacity: 0.92,
        pressedScale: 0.97,
      }),
    ).toEqual({
      opacity: 0.92,
      transform: [{ scale: 0.97 }],
    });
  });
});
