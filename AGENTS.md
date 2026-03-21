# AGENTS.md

This guide helps coding agents make safe, high-quality changes in the `trainer` repository.

## LLM-Oriented Design

- Treat `docs/llm_oriented_design.md` as the mandatory design baseline for all non-iOS code in this repository.
- `AGENTS.md` is the repo-specific enforcement layer. If a subtree needs a temporary exception, write it explicitly in `AGENTS.md` or a nested subtree `AGENTS.md`; never infer exceptions.
- Hard rules for non-iOS production code:
  - max file size: `800` LOC
  - one file, one responsibility
  - every module begins with a calling spec block
  - prefer pure functions over methods when object state is unnecessary
  - prefer dict dispatch and thin registries over factory / strategy indirection
  - keep deterministic logic in standalone, tested helpers or tools
  - keep entrypoints and coordinators as slim recipe-style orchestrators
  - separate schema-like contracts from mutation or orchestration logic
  - request/config models should reject unknown fields unless a documented exception is required

## Before Committing

- Review `git diff` for secrets, tokens, credentials, local paths, private data, or other sensitive material.
- Do not commit until the diff is clean.

## Commit Messages

- Use conventional commit format: `type(scope): subject`. Type is lowercase: `feat`, `fix`, `docs`, `test`, `chore`, `refactor`, etc. Scope is optional (e.g. `feat(dashboard):`, `fix:`).
- Subject: overall change in imperative mood.
- Following lines: bullet points summarizing concrete changes in the diff.
- Do not invent details.

## PR hygiene

- Keep PR descriptions concise and structured:
  - What changed
  - Why
  - Validation performed
  - Risks / follow-ups

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

## Styling Guidelines

- Use Design System Defaults. Prefer Tailwind’s standard scales for spacing, sizing, and typography.
- Use utilities like text-sm, leading-5, max-w-sm, gap-4, p-4.
- Avoid Arbitrary Values
- Avoid [value] classes like: max-w-[320px], leading-[19px], top-[3px]
- These should be rare and only used when absolutely necessary.
- Fix Layout Properly. Do not use small positional tweaks to fix alignment. Use layout primitives instead: flex, grid, gap, items-_, justify-_.

## Development workflow for agents

1. Read relevant docs first (`README.md`, `docs/architecture.md`, and touched feature files).
2. Make the smallest change that solves the task.
3. When delegating implementation work to a subagent, always create a dedicated git worktree for that subagent.
4. Each subagent must use its own branch in its assigned worktree and commit/push from that branch instead of working in the shared workspace.
5. Run validation commands before finalizing.
6. Summarize behavior impact, not just code diffs.

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

## Safety

- Never add secrets or tokens.
- Avoid destructive schema/data changes unless explicitly requested.
- Prefer additive migrations and backward-compatible updates.
