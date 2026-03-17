export const BODY_WEIGHT_TABLE = 'body_weight_entries';
export const BODY_WEIGHT_UNITS = ['kg', 'lb'] as const;

export type BodyWeightUnit = (typeof BODY_WEIGHT_UNITS)[number];

export interface BodyWeightEntryRow {
  id: string;
  weight: number;
  unit: string;
  logged_at: number;
  notes: string | null;
}

export interface BodyWeightEntry {
  id: string;
  weight: number;
  unit: BodyWeightUnit;
  loggedAt: number;
  notes: string | null;
}

export interface BodyWeightEntryInput {
  weight: number;
  unit: BodyWeightUnit;
  loggedAt: number;
  notes?: string | null;
}

export interface BodyWeightFormState {
  weight: string;
  unit: BodyWeightUnit;
  date: string;
  time: string;
  notes: string;
}

export function coerceBodyWeightUnit(unit: string): BodyWeightUnit {
  return unit === 'lb' ? 'lb' : 'kg';
}

export function mapBodyWeightEntry(row: BodyWeightEntryRow): BodyWeightEntry {
  return {
    id: row.id,
    weight: row.weight,
    unit: coerceBodyWeightUnit(row.unit),
    loggedAt: row.logged_at,
    notes: row.notes,
  };
}

export function sanitizeBodyWeightEntryInput(
  input: BodyWeightEntryInput,
): BodyWeightEntryInput {
  const notes = input.notes?.trim() ?? '';

  return {
    weight: input.weight,
    unit: coerceBodyWeightUnit(input.unit),
    loggedAt: Math.round(input.loggedAt),
    notes: notes === '' ? null : notes,
  };
}

export function formatBodyWeightValue(weight: number): string {
  if (Number.isInteger(weight)) {
    return String(weight);
  }

  return weight.toFixed(1).replace(/\.0$/, '');
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

export function formatDateInput(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function formatTimeInput(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function formatLoggedAtLabel(loggedAt: number): string {
  const date = new Date(loggedAt);
  return `${formatDateInput(date)} at ${formatTimeInput(date)}`;
}

export function createBodyWeightFormState(
  timestamp: number = Date.now(),
  unit: BodyWeightUnit = 'kg',
): BodyWeightFormState {
  const date = new Date(timestamp);

  return {
    weight: '',
    unit,
    date: formatDateInput(date),
    time: formatTimeInput(date),
    notes: '',
  };
}

export function bodyWeightEntryToFormState(
  entry: BodyWeightEntry,
): BodyWeightFormState {
  const date = new Date(entry.loggedAt);

  return {
    weight: formatBodyWeightValue(entry.weight),
    unit: entry.unit,
    date: formatDateInput(date),
    time: formatTimeInput(date),
    notes: entry.notes ?? '',
  };
}

export function buildLoggedAtTimestamp(
  dateInput: string,
  timeInput: string,
): number | null {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateInput.trim());
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(timeInput.trim());

  if (!dateMatch || !timeMatch) {
    return null;
  }

  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);
  const hours = Number(timeMatch[1]);
  const minutes = Number(timeMatch[2]);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31 ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }

  const date = new Date(year, month - 1, day, hours, minutes, 0, 0);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day ||
    date.getHours() !== hours ||
    date.getMinutes() !== minutes
  ) {
    return null;
  }

  return date.getTime();
}
