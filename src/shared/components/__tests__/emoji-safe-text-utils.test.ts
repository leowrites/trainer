import { splitTextIntoEmojiRuns } from '../emoji-safe-text-utils';

describe('splitTextIntoEmojiRuns', () => {
  it('returns one text run for plain text', () => {
    expect(splitTextIntoEmojiRuns('Start of workout')).toEqual([
      { kind: 'text', text: 'Start of workout' },
    ]);
  });

  it('returns one emoji run for emoji-only content', () => {
    expect(splitTextIntoEmojiRuns('💪')).toEqual([
      { kind: 'emoji', text: '💪' },
    ]);
  });

  it('splits mixed text and emoji content in order', () => {
    expect(splitTextIntoEmojiRuns('Start 💪 End 🎉')).toEqual([
      { kind: 'text', text: 'Start ' },
      { kind: 'emoji', text: '💪' },
      { kind: 'text', text: ' End ' },
      { kind: 'emoji', text: '🎉' },
    ]);
  });

  it('handles consecutive emoji and skin-tone modifiers', () => {
    expect(splitTextIntoEmojiRuns('🔥👍🏽💪')).toEqual([
      { kind: 'emoji', text: '🔥' },
      { kind: 'emoji', text: '👍🏽' },
      { kind: 'emoji', text: '💪' },
    ]);
  });
});
