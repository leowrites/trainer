/**
 * Shared components
 *
 * Reusable, feature-agnostic UI primitives used across multiple feature slices.
 * Components here must have no dependency on any feature slice.
 *
 * Available primitives:
 *  - Container    — full-screen layout wrapper with consistent padding
 *  - Surface      — layered background surfaces (default / card / elevated / push / pull / rest)
 *  - Card         — bordered surface card with optional label strip
 *  - Header       — app-level header bar with logo and meta slots
 *  - Grid / GridItem — 12-column flex grid layout
 *  - Heading, Body, Label, Caption, Muted, StatValue — typography scale
 *  - StatRow      — large metric display (value + unit + sub-label)
 *  - Badge        — semantic colour tag with optional pulse animation
 *  - Button       — pressable CTA with variants (primary / secondary / ghost / danger)
 *  - ProgressBar  — horizontal fill indicator with variants
 *  - Input        — theme-aware text input field
 *  - Checkbox     — toggle row with label and optional sub-label
 *  - ActionRow    — paired primary/secondary form actions
 *  - DisclosureCard — expandable card row with actions and detail surface
 */

// ── Layout ────────────────────────────────────────────────────────────────────
export { Container } from './container';
export type { ContainerProps } from './container';

export { Surface } from './surface';
export type { SurfaceProps, SurfaceVariant } from './surface';

export { Grid, GridItem } from './grid';
export type { GridProps, GridItemProps, ColSpan } from './grid';

// ── Composite blocks ──────────────────────────────────────────────────────────
export { Card } from './card';
export type { CardProps } from './card';

export { DisclosureCard } from './disclosure-card';
export type { DisclosureCardProps } from './disclosure-card';

export { Header } from './header';
export type { HeaderProps } from './header';

export { StatRow } from './stat-row';
export type { StatRowProps } from './stat-row';

// ── Typography ────────────────────────────────────────────────────────────────
export {
  DisplayHeading,
  Heading,
  Body,
  Label,
  Caption,
  Meta,
  Muted,
  StatValue,
} from './typography';

// ── Interactive primitives ────────────────────────────────────────────────────
export { Badge } from './badge';
export type { BadgeProps, BadgeVariant } from './badge';

export { Button } from './button';
export type { ButtonProps, ButtonVariant, ButtonSize } from './button';

export { InteractivePressable } from './interactive-pressable';
export type { InteractivePressableProps } from './interactive-pressable';

export { ActionRow } from './action-row';
export type { ActionRowProps } from './action-row';

export { ExerciseCard } from './exercise-card';
export type {
  ExerciseCardProps,
  ExerciseCardMenuAction,
} from './exercise-card';

// ── Data visualisation ────────────────────────────────────────────────────────
export { ProgressBar } from './progress-bar';
export type { ProgressBarProps, ProgressBarVariant } from './progress-bar';

export { createGluestackColorConfig } from './gluestack-theme';
export type { GluestackColorConfig } from './gluestack-theme';
export { GluestackUIProvider } from './gluestack-provider';
export { GluestackButton } from './gluestack-button';
export type { GluestackButtonProps } from './gluestack-button';

// ── Form primitives ───────────────────────────────────────────────────────────
export { Input } from './input';
export type { InputProps } from './input';

export { Checkbox } from './checkbox';
export type { CheckboxProps } from './checkbox';
