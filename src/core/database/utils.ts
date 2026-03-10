/**
 * Generate a random UUID-like identifier.
 *
 * Uses a simple hex-based approach that works in all JS runtimes
 * (Hermes, JSC, V8) without requiring the `crypto` API.
 */
export function generateId(): string {
  const hex = '0123456789abcdef';
  let id = '';
  for (let i = 0; i < 32; i++) {
    id += hex[Math.floor(Math.random() * 16)];
    if (i === 7 || i === 11 || i === 15 || i === 19) {
      id += '-';
    }
  }
  return id;
}
