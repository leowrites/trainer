/**
 * Focused set hero helpers.
 *
 * CALLING SPEC:
 * - use to drive focused hero value zones for weight and reps
 * - provides deterministic formatting and option generation for hero wheels
 * - has no side effects
 */

export type HeroValueField = 'weight' | 'reps';

export function buildHeroWheelOptions(
  selectedValue: number,
  maximum: number,
  step: number,
): number[] {
  const options = Array.from(
    { length: Math.floor(maximum / step) + 1 },
    (_, index) => index * step,
  );

  if (
    selectedValue < 0 ||
    (selectedValue <= maximum && options.includes(selectedValue))
  ) {
    return options;
  }

  return [...options, selectedValue].sort((left, right) => left - right);
}

export function formatHeroValue(field: HeroValueField, value: number): string {
  const normalizedValue = Number.isInteger(value) ? String(value) : `${value}`;
  return field === 'weight' ? `${normalizedValue} lbs` : normalizedValue;
}
