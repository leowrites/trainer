/**
 * Live second hook.
 *
 * CALLING SPEC:
 * - `useLiveSecond(enabled)` returns a clock value that updates once per second.
 * - Intended only for small display surfaces such as labels and countdown text.
 * - Side effects: registers and clears one interval while enabled.
 */

import { useEffect, useState } from 'react';

export function useLiveSecond(enabled: boolean): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!enabled) {
      setNow(Date.now());
      return;
    }

    setNow(Date.now());
    const intervalId = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, [enabled]);

  return now;
}
