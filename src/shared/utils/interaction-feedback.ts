/**
 * Calling spec
 *
 * use when:
 * - a high-confidence workout interaction should trigger tactile confirmation
 *
 * does:
 * - exposes a small set of interaction intents mapped to native haptics
 * - no-ops on web where haptics are not relevant for this app
 *
 * does not:
 * - decide when feedback should fire
 * - replace visible press states
 */

import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

export type InteractionFeedbackIntent = 'set-log' | 'set-unlog' | 'set-adjust';

export function triggerInteractionFeedback(
  intent: InteractionFeedbackIntent,
): void {
  if (Platform.OS === 'web') {
    return;
  }

  if (intent === 'set-log') {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(
      () => undefined,
    );
    return;
  }

  if (intent === 'set-adjust') {
    void Haptics.selectionAsync().catch(() => undefined);
    return;
  }

  void Haptics.selectionAsync().catch(() => undefined);
}
