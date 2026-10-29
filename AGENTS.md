# Agent guide

This is a Vite + React + TypeScript SPA for TypeSafe's Jev model (System One). Read `docs/specs/2026-10-29-jev-system-one-ui-design.md` before changing behavior. The implementation plan is `docs/plans/2026-10-29-jev-system-one-ui.md`.

## Architecture

- `src/domain` is pure. Parsing and validation do not import React. Add tests here first.
- `src/api` is the only place that knows the System One JSON. UI code builds a `Draft` and calls `buildSystemOneRequest` plus `createClientFromEnv`.
- `src/storage/conversations.ts` is the localStorage schema (`jev.store.v1`). Bump the key if the shape changes and keep `loadStore` tolerant of bad JSON.
- React context in `ThemeProvider`, `AuthProvider`, and `ConversationProvider` is the only shared state. There is no server cache.
- Catalyst components live in `src/components/catalyst` and are imported by our components. Prefer those primitives (Button, Input, Dialog, Sidebar, Field, Badge) over new one-off controls.

## Catalyst must not be committed

`src/components/catalyst/` is gitignored. The kit is paid per developer. Before every commit:

```bash
git status --short
git ls-files | grep -E 'catalyst|\.zip$' || true
```

Both must show no Catalyst files and no kit zip. After copying a fresh kit, run `node scripts/patch-catalyst-link.mjs` so `Link` uses React Router. Do not vendor the zip.

## Commands

```bash
npm test
npm run lint
npm run build
npm run dev
```

`npm run build` runs `tsc --noEmit` first. TypeScript is strict. ESLint is type-checked and ignores the Catalyst directory. Prettier owns formatting (`npm run format`).

## Jev concepts

A request is `model` + `state` + `questions`. State is the content being judged (string, object, or array). Every question sees the same state and is independent. The question id is the object key and is not part of the prompt; the full question goes in `instructions`.

| Type     | Criteria                                                                                               | Answer                                           |
| -------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------ |
| `choice` | Map of option name to description or `null`. Min 1, app max 100 (API max 255).                         | `choice`, `probabilities`, `confidence`          |
| `score`  | Ordered level strings, index 0 is low. App min 2, app max 100, API max 10 (warning, not a hard block). | `score`, `legend`, `probabilities`, `confidence` |
| `noul`   | Optional `{ true, false }` descriptions.                                                               | `noul` from 0 to 1. No confidence.               |

Box is in the answer union so an unexpected payload does not crash the renderer. The UI must not send it.

Errors follow TypeSafe: 400, 401, 413, 415, 422, 429, 529. The client class is `SystemOneError`. The contract for the future proxy is `docs/backend-contract.md`.

## How to add a question type

1. Add the question and answer types in `src/api/types.ts`.
2. Extend `QuestionType`, `createQuestion`, and `toQuestion` in `build-request.ts`.
3. Add validation rules and tests in `src/domain/validation.ts`.
4. If the upload format can express it, teach `parseQuestionUpload` and add a fixture in `parser.test.ts`.
5. Extend `QuestionCard` for the editor and `AnswerBody` for the result.
6. Teach `createMockClient` to return a realistic answer whose probabilities sum to 1.
7. Mention the type in `README.md` and `AGENTS.md`.

Keep the editor on strings unless you are ready to support structured JSON instructions. The API allows objects and arrays there; this UI does not edit them.

## Conventions

- Question ids match `QUESTION_ID_PATTERN`. Upload ids look like `q1`. Manual ids look like `choice_1`.
- Warnings never disable Ask or Add. Errors do.
- Do not trim text state before sending it. Do trim instructions, option names, and level text.
- Snapshot questions onto a turn before the draft is edited again (`snapshotQuestions`).
- Mock latency and the 529 roll are injectable (`delayMs`, `random`) so tests stay deterministic.
- Auth bypass is `isAuthBypass()`. Do not mount `LogtoProvider` on that path. `useLogto` throws without it.
