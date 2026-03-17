# AGENTS.md

This guide helps coding agents make safe, high-quality changes in the `trainer` repository.

## Mission and product context

- Trainer is an **offline-first** React Native fitness app built with Expo.
- Persistent data uses **expo-sqlite**; transient UI/session state uses **Zustand**.
- The codebase follows **Feature-Sliced Design (FSD)**.

## Repository map

- `src/features/*`: product slices (`routines`, `schedule`, `workout-mode`, `analytics`, `health-tracking`).
- `src/core/*`: app-wide infrastructure (`database`, `navigation`, `theme`).
- `src/shared/*`: reusable components, hooks, constants, and types.
- `docs/`: architecture and platform/build notes.

## Non-negotiable architecture rules

1. **Do not mix persistence and ephemeral state**:
   - SQLite (`src/core/database`) for durable domain data.
   - Zustand for temporary in-memory state.
2. **No cross-feature internals imports**:
   - Import from another feature's `index.ts` (public API) only.
3. **Keep SQL out of React components**:
   - Put queries/writes in feature hooks/helpers.
4. **Type safety first**:
   - Avoid `any`; explicitly type entities, hook outputs, and component props.

## UI and component usage

- Prefer composition with `src/shared/components` before introducing one-off UI.
- Reuse patterns like `Card`, `DisclosureCard`, `ActionRow`, `Button`, `Input`, and typography primitives.
- If a UI pattern is reused, extract it into `src/shared/components`.

## Coding conventions

- Use TypeScript path aliases (`@/*`, `@features/*`, `@core/*`, `@shared/*`) where appropriate.
- Keep files focused: domain logic in feature/domain/hooks, not screen components.
- Follow existing naming conventions and colocate tests with their feature area under `__tests__`.

## Development workflow for agents

1. Read relevant docs first (`README.md`, `docs/architecture.md`, and touched feature files).
2. Make the smallest change that solves the task.
3. Run validation commands before finalizing.
4. Summarize behavior impact, not just code diffs.

## Validation checklist

Run the most relevant subset, then report outcomes:

```bash
npm run lint
npm run type-check
npm test -- --runInBand
npm run format:check
```

If a command fails due to environment limits, report it explicitly.

## Frontend change expectations

- For perceptible UI changes, capture a screenshot via the browser tooling when available.
- Include the screenshot artifact path in your final report.

## Commit and PR hygiene

- Use Conventional Commits (example: `docs(agents): add repository operating guide`).
- Keep PR descriptions concise and structured:
  - What changed
  - Why
  - Validation performed
  - Risks / follow-ups

## Safety

- Never add secrets or tokens.
- Avoid destructive schema/data changes unless explicitly requested.
- Prefer additive migrations and backward-compatible updates.
