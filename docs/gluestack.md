# Gluestack integration

This repository is adopting `gluestack-ui` as the primary component foundation. The goal is to pair Gluestack's reusable primitives with the existing feature-sliced and NativeWind-heavy architecture while keeping our semantic theme tokens as the single source of truth.

## Why Gluestack?

- **Expo-friendly:** `gluestack-ui` is designed for Expo-managed React Native and can be added without ejecting or diving into custom native modules.
- **Theming chops:** The library exposes a theming surface that can consume our colour and spacing tokens, which keeps every screen aligned with the Claude-inspired palette.
- **Composable primitives:** Buttons, cards, sheets, and layout blocks ship out of the box and can replace current shared components gradually, reducing duplication.

## Integration steps

1. Run `npx gluestack-ui init` once the local Node toolchain is functional. Gluestack's official Expo flow is CLI-first and generates the provider scaffolding plus the required config files.
2. Add only the primitives we need with `npx gluestack-ui add <component>` instead of introducing a blanket dependency with no generated setup.
3. Keep `@core/theme` and `ThemeProvider` in place so NativeWind components continue to read semantic tokens; the generated `GluestackUIProvider` should be a sibling provider that shares the same token source.
4. Build Gluestack component wrappers inside `src/shared/components` (e.g. `Button`, `Card`) that compose the generated Gluestack primitives while still respecting the exported token helpers. Replace bespoke versions one at a time while keeping the migration reversible.
5. Keep this document updated with the migration status and any wrapper conventions so feature slices know what primitives to consume next.

## Theme bridging

Use the `createGluestackColorConfig(tokens)` helper exported from `@shared/components/gluestack-theme` to seed the Gluestack config. That helper derives colour values from `ThemeTokens` and is already aware of the light/dark variants we expose via `ThemeProvider`.

When defining Gluestack component overrides (variants, sizes, etc.), reference the same tokens (e.g., `tokens.bgCard`, `tokens.accent`) so the new primitives always match the rest of the UI. If you need spacing or typography values, import them from `@core/theme/spacing` or `@core/theme/typography`.

## What to document next

- Which Gluestack primitives are part of the MVP (button, glass card, form input, list item, sheet/dialog).
- How to keep NativeWind utilities and Gluestack props aligned (`className` vs. Gluestack `styled` props).
- A migration checklist per feature slice so new screens adopt Gluestack components by default.
