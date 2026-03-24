/**
 * Perf lab command bus.
 *
 * CALLING SPEC:
 * - Exposes a tiny in-memory pub/sub bus for debug perf scenarios that need
 *   to drive route-local UI from outside the screen tree.
 * - Commands are transient, process-local, and only used in perf-lab mode.
 * - Side effects: notifies subscribed listeners.
 */

export type PerfLabCommand =
  | { type: 'active-workout/open-overview' }
  | { type: 'active-workout/close-overview' };

type PerfLabCommandListener = (command: PerfLabCommand) => void;

const listeners = new Set<PerfLabCommandListener>();

export function emitPerfLabCommand(command: PerfLabCommand): void {
  listeners.forEach((listener) => {
    listener(command);
  });
}

export function subscribePerfLabCommand(
  listener: PerfLabCommandListener,
): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}
