import { coerceBodyWeightUnit, type BodyWeightUnit } from './body-weight';

export const USER_PROFILE_TABLE = 'user_profile';

export interface UserProfileRow {
  id: string;
  display_name: string | null;
  preferred_weight_unit: string;
  created_at: number;
  updated_at: number;
}

export interface UserProfile {
  id: string;
  displayName: string | null;
  preferredWeightUnit: BodyWeightUnit;
  createdAt: number;
  updatedAt: number;
}

export interface UserProfileInput {
  displayName?: string | null;
  preferredWeightUnit: BodyWeightUnit;
}

export function mapUserProfile(row: UserProfileRow): UserProfile {
  return {
    id: row.id,
    displayName: row.display_name,
    preferredWeightUnit: coerceBodyWeightUnit(row.preferred_weight_unit),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function sanitizeUserProfileInput(
  input: UserProfileInput,
): UserProfileInput {
  const trimmedName = input.displayName?.trim() ?? '';

  return {
    displayName: trimmedName === '' ? null : trimmedName,
    preferredWeightUnit: coerceBodyWeightUnit(input.preferredWeightUnit),
  };
}
