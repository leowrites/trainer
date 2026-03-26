/**
 * Emoji-safe text utilities.
 *
 * CALLING SPEC:
 * - split a string into deterministic text/emoji runs
 * - keep all original characters and ordering
 * - detect emoji grapheme-like sequences, including ZWJ chains and modifiers
 */

export interface EmojiTextRun {
  kind: 'text' | 'emoji';
  text: string;
}

const EMOJI_SEQUENCE_REGEX =
  /\p{Extended_Pictographic}(?:\uFE0F|\uFE0E)?(?:\p{Emoji_Modifier})?(?:\u200D\p{Extended_Pictographic}(?:\uFE0F|\uFE0E)?(?:\p{Emoji_Modifier})?)*/gu;

export function splitTextIntoEmojiRuns(input: string): EmojiTextRun[] {
  if (input.length === 0) {
    return [];
  }

  const runs: EmojiTextRun[] = [];
  let cursor = 0;

  for (const match of input.matchAll(EMOJI_SEQUENCE_REGEX)) {
    const emojiText = match[0];
    const start = match.index ?? 0;

    if (start > cursor) {
      runs.push({
        kind: 'text',
        text: input.slice(cursor, start),
      });
    }

    runs.push({
      kind: 'emoji',
      text: emojiText,
    });

    cursor = start + emojiText.length;
  }

  if (cursor < input.length) {
    runs.push({
      kind: 'text',
      text: input.slice(cursor),
    });
  }

  return runs;
}
