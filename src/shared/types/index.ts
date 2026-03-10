/**
 * Shared TypeScript types
 *
 * Cross-cutting type definitions that are not specific to any feature slice.
 * Feature-specific types should live inside the feature's own types/ sub-folder.
 */

/** Unit system preference */
export type WeightUnit = 'kg' | 'lbs';

/** Generic ID type — UUID string used as the primary key for all database entities */
export type RecordId = string;

/** A nullable value */
export type Nullable<T> = T | null;

/** ISO 8601 date string */
export type ISODateString = string;
