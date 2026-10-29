# Jev System One UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Ship a static Vite + React chat UI for TypeSafe Jev (System One) with Choice, Score, and Noul questions, a tested upload parser, a mock/HTTP API client, and Logto wired with a dev bypass.

**Architecture:** Pure modules (`src/domain`, `src/api`) own parsing, validation, and the System One contract and are tested with Vitest. React context owns theme, auth, and the localStorage conversation store. Catalyst components (gitignored) are the visual primitives; our components in `src/components` compose them into a chat shell.

**Tech Stack:** Vite 7, React 19, TypeScript 5 strict, Tailwind CSS 4, React Router 7, Vitest 3, ESLint 9, Prettier 3, `@logto/react`, Headless UI, Heroicons, Motion.

## Global Constraints

- Static SPA only. No SSR.
- TypeScript `strict` is on. Do not weaken it to silence app code.
- Catalyst files live only in `src/components/catalyst/` and that directory is gitignored. Never `git add` a Catalyst file or the kit zip.
- Question types in the UI: `choice`, `score`, `noul`. Box is typed on the client and never sent.
- Choice and Score entry cap is 100. Score below 2 levels is an error. Score above 10 levels is a warning.
- Warnings never block submit or "Add questions". Errors do.
- Default API mode is mock. Bypass Logto unless mode is `http` and both `VITE_LOGTO_ENDPOINT` and `VITE_LOGTO_APP_ID` are set.
- Branch: `cursor/jev-system-one-ui-85c7`. Do not commit on `main`.
- Spec: `docs/specs/2026-10-29-jev-system-one-ui-design.md`. If this plan and the spec disagree, the spec wins.

---

### Task 1: Scaffold, Catalyst install, link patch

**Files:**

- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `eslint.config.js`, `prettier.config.js`, `.prettierignore`, `.gitignore`, `.env.example`, `index.html`, `public/favicon.svg`, `src/index.css`, `src/vite-env.d.ts`, `src/main.tsx`, `scripts/patch-catalyst-link.mjs`
- Local only (gitignored): `src/components/catalyst/*.tsx`

**Interfaces:**

- Consumes: nothing
- Produces: a Vite app that typechecks, Tailwind v4 with class-based `dark`, and a Catalyst `Link` that renders React Router's `Link` via `href`.

- [x] **Step 1: Confirm the toolchain files from the spec's stack exist and `npm install` has been run.**

- [x] **Step 2: Extract `catalyst-ui-kit/typescript/*.tsx` into `src/components/catalyst/`.**

- [x] **Step 3: Write and run the link patch.**

`scripts/patch-catalyst-link.mjs` overwrites `src/components/catalyst/link.tsx` with a forwardRef component that accepts `href: string`, renders `Link` from `react-router` as `to={href}`, and wraps it in `Headless.DataInteractive`.

Run: `node scripts/patch-catalyst-link.mjs`

- [x] **Step 4: Confirm Catalyst is not tracked.**

Run: `git check-ignore -v src/components/catalyst/button.tsx`
Expected: a match on `src/components/catalyst/`.

Run: `git status --short src/components/catalyst`
Expected: empty.

- [x] **Step 5: Commit scaffold, spec, and plan. Do not stage `src/components/catalyst`.**

```bash
git add docs package.json package-lock.json tsconfig.json vite.config.ts eslint.config.js prettier.config.js .prettierignore .gitignore .env.example index.html public src/index.css src/vite-env.d.ts src/main.tsx scripts
git status --short
git commit -m "docs: add Jev UI spec and plan, scaffold Vite app"
```

Review checkpoint: `git ls-files | grep -E 'catalyst|\\.zip$'` prints nothing. `npx tsc --noEmit` passes.

### Task 2: Question drafts and validation (TDD)

**Files:**

- Create: `src/domain/questions.ts`, `src/domain/validation.ts`, `src/domain/validation.test.ts`
- Test: `src/domain/validation.test.ts`

**Interfaces:**

- Consumes: nothing
- Produces:

```ts
export const MAX_ENTRIES = 100;
export const MIN_SCORE_ENTRIES = 2;
export const SCORE_API_MAX = 10;
export const QUESTION_ID_PATTERN = /^[A-Za-z][A-Za-z0-9_-]{0,63}$/;

export type QuestionType = 'choice' | 'score' | 'noul';
export type StateMode = 'text' | 'json';
export type DraftEntry = { key: string; text: string; description: string; sourceLine?: number };
export type DraftQuestion = {
  key: string;
  id: string;
  type: QuestionType;
  instructions: string;
  entries: DraftEntry[];
  yesMeans: string;
  noMeans: string;
  sourceLine?: number;
};
export type Draft = {
  stateMode: StateMode;
  stateText: string;
  model: string;
  questions: DraftQuestion[];
};
export type ValidationIssue = {
  severity: 'error' | 'warning';
  message: string;
  questionKey?: string;
  entryKey?: string;
  field?: 'id' | 'instructions' | 'entries' | 'state' | 'model' | 'yesMeans' | 'noMeans';
  line?: number;
};

export function createEntry(text?: string, sourceLine?: number): DraftEntry;
export function createQuestion(type: QuestionType, existingIds: readonly string[]): DraftQuestion;
export function emptyDraft(): Draft;
export function validateQuestions(questions: readonly DraftQuestion[]): ValidationIssue[];
export function validateState(mode: StateMode, raw: string): ValidationIssue[];
export function validateModel(model: string): ValidationIssue[];
export function validateDraft(draft: Draft): ValidationIssue[];
export function hasErrors(issues: readonly { severity: string }[]): boolean;
```

`createQuestion` starts Choice and Score with two blank entries. Noul starts with none. Ids are `choice_1`, `score_1`, `noul_1`, skipping collisions.

- [x] **Step 1: Write `src/domain/validation.test.ts` covering:**
  - Choice with one named option passes.
  - Choice with zero options errors, and the issue's `line` is the question `sourceLine`.
  - Choice with 101 options errors and `line` is the 101st entry's `sourceLine`.
  - Blank and case-insensitive duplicate Choice names error.
  - Score with one level errors. Score with two levels passes. Score with 11 levels warns and does not error. Score with 101 levels errors.
  - Duplicate question ids error. Id `1bad` errors. Id `ok_id-1` is accepted.
  - Blank instructions error.
  - Noul with both criteria blank has no criteria issue. Noul with only `yesMeans` warns.
  - Empty question list errors.
  - Text state of spaces errors. JSON `{"a":1}` and `"hi"` and `[1]` pass. JSON `1`, `null`, and `{` error.
  - Blank model errors.
  - `hasErrors` is true only when an issue has severity `error`.

- [x] **Step 2: Run `npx vitest run src/domain/validation.test.ts` and confirm failure (module missing).**

- [x] **Step 3: Implement `questions.ts` and `validation.ts` until the test passes.**

- [x] **Step 4: Commit.**

```bash
git add src/domain/questions.ts src/domain/validation.ts src/domain/validation.test.ts
git commit -m "feat: validate Jev question drafts"
```

Review checkpoint: re-read the Validation section of the spec against `validateQuestions`. Every bullet has a test.

### Task 3: Upload parser (TDD)

**Files:**

- Create: `src/domain/parser.ts`, `src/domain/parser.test.ts`
- Test: `src/domain/parser.test.ts`

**Interfaces:**

- Consumes: `DraftQuestion`, `QuestionType`, `createEntry` from `src/domain/questions.ts`. Validation from Task 2 is applied by the UI, not by the parser.
- Produces:

```ts
export type ParseIssue = { line: number; severity: 'error' | 'warning'; message: string };
export type ParseResult = { questions: DraftQuestion[]; issues: ParseIssue[] };
export function parseQuestionUpload(text: string, type: QuestionType): ParseResult;
```

Parsed questions use `key` from `crypto.randomUUID()`, id `q{number}` with `_2`, `_3` suffixes, `sourceLine` on the question and each entry, `description` `''`, and blank `yesMeans` / `noMeans`.

- [x] **Step 1: Write tests for the exact Noul and Choice samples in the spec, plus:**
  - Score preserves level order `['low', 'high']`.
  - `\r\n`, blank lines, surrounding whitespace, a leading BOM, `1)` and `a)`.
  - A Choice question with no options still returns the question; validation (called in the test) reports an error on that line.
  - 101 options: the draft contains 101 entries and validation reports an error whose `line` is the 101st option line.
  - Continuation line joins with a space.
  - Option before a question is a parser error and is not an entry.
  - Empty input is one parser error on line 1 and zero questions.
  - Duplicate question numbers warn and yield `q1` and `q1_2`.
  - Duplicate letter `b` warns and keeps both texts.
  - A lettered line in a Noul upload warns and becomes part of the instructions.
  - Unrecognized text before the first question warns.

- [x] **Step 2: Run the test file and confirm it fails.**

- [x] **Step 3: Implement the line state machine described in the spec.**

- [x] **Step 4: Re-run the test file. Commit.**

```bash
git add src/domain/parser.ts src/domain/parser.test.ts
git commit -m "feat: parse multi-question upload text"
```

Review checkpoint: fixtures in the spec round-trip to the expected instructions and entry texts. Parser issues all have 1-based lines.

### Task 4: System One types, request builder, mock, HTTP client (TDD)

**Files:**

- Create: `src/api/types.ts`, `src/api/errors.ts`, `src/api/build-request.ts`, `src/api/build-request.test.ts`, `src/api/mock.ts`, `src/api/mock.test.ts`, `src/api/http.ts`, `src/api/client.ts`
- Test: `src/api/build-request.test.ts`, `src/api/mock.test.ts`

**Interfaces:**

- Consumes: `Draft`, `DraftQuestion` from Task 2.
- Produces:

```ts
export type StateValue = string | Record<string, unknown> | unknown[];
export type SystemOneRequest = {
  model: string;
  state: StateValue;
  questions: Record<string, Question>;
};
export type Question = NoulQuestion | ChoiceQuestion | ScoreQuestion;
export type SystemOneResponse = { model: string; answers: Record<string, Answer>; usage: Usage };
export type Answer = NoulAnswer | ChoiceAnswer | ScoreAnswer | BoxAnswer;

export class SystemOneError extends Error {
  readonly status: number;
  readonly detail: unknown;
}

export function buildSystemOneRequest(draft: Draft): SystemOneRequest;
export function parseStateValue(mode: StateMode, raw: string): StateValue;

export type SystemOneClient = {
  evaluate(
    request: SystemOneRequest,
    init?: { accessToken?: string; signal?: AbortSignal },
  ): Promise<SystemOneResponse>;
};
export function createMockClient(options?: {
  delayMs?: number;
  random?: () => number;
}): SystemOneClient;
export function createHttpClient(baseUrl: string): SystemOneClient;
export function createClientFromEnv(): SystemOneClient;
```

`buildSystemOneRequest` throws `SystemOneError` (status 0) if `validateDraft` has errors. It assumes the caller already checked; the throw is a backstop. Choice criteria values are `null` when the description is blank. Noul omits `criteria` when both sides are blank.

Mock behavior is the spec's Mock section. `createClientFromEnv` reads `import.meta.env.VITE_API_MODE` and `VITE_API_BASE_URL`.

- [x] **Step 1: Write build-request tests:**
  - Text state is passed through unchanged, including leading spaces when the string is not only whitespace. The test draft must be valid, so use `'  hello'` .
  - JSON object state is an object, not a string.
  - Choice maps names to descriptions and `null`.
  - Score `criteria` equals the level strings in order.
  - Noul omits criteria when blank and sends `{ true: 'yes' }` when only yes is set.
  - Invalid draft throws `SystemOneError`.

- [x] **Step 2: Write mock tests with `delayMs: 0` and `random: () => 0.5`:**
  - Choice probabilities sum to 1 (tolerance 1e-9), include every criteria key, and `choice` is an argmax key.
  - Same request twice returns deep-equal answers.
  - Score equals the weighted sum of level indexes, legend keys are `'0'..`, probabilities sum to 1.
  - Noul is within 0..1 and has no `confidence` property.
  - State containing `[simulate-error]` rejects with status 422.
  - `random: () => 0` rejects with status 529.
  - An aborted signal rejects with `DOMException` name `AbortError` (use `delayMs: 50`).

- [x] **Step 3: Run both test files and confirm they fail.**

- [x] **Step 4: Implement until both pass. HTTP client is untested here; it must:**
  - `POST ${baseUrl.replace(/\/$/, '')}/v1/systemone`
  - set `Content-Type: application/json` and `Authorization` only when `accessToken` is a non-empty string
  - on non-OK, parse JSON `detail` into `SystemOneError`
  - on network failure, throw `SystemOneError` with status 0
  - pass `signal` to `fetch`
  - missing base URL throws status 0 before fetch

- [x] **Step 5: Commit.**

```bash
git add src/api
git commit -m "feat: add System One client with mock and HTTP modes"
```

Review checkpoint: response shapes in `src/api/types.ts` include the required fields from the System One docs for Noul, Choice, and Score answers. Box is present on the answer union and absent from the question union the builder emits.

### Task 5: Theme, conversation store, auth, router shell

**Files:**

- Create: `src/storage/conversations.ts`, `src/storage/conversations.test.ts`, `src/theme/ThemeProvider.tsx`, `src/auth/config.ts`, `src/auth/AuthProvider.tsx`, `src/auth/RequireAuth.tsx`, `src/pages/SignInPage.tsx`, `src/pages/CallbackPage.tsx`, `src/pages/SignOutPage.tsx`, `src/components/shell/AppShell.tsx`, `src/components/shell/ConversationSidebar.tsx`, `src/components/shell/ThemeControl.tsx`, `src/App.tsx`
- Modify: `src/main.tsx`
- Test: `src/storage/conversations.test.ts`

**Interfaces:**

- Consumes: `Draft`, `emptyDraft`, `DraftQuestion` from Task 2. `SystemOneResponse` from Task 4.
- Produces:

```ts
export type Turn = {/* spec */};
export type Conversation = {/* spec */};
export type Store = { conversations: Conversation[]; newDraft: Draft };

export function loadStore(storage: Pick<Storage, 'getItem'>): Store;
export function saveStore(storage: Pick<Storage, 'setItem'>, store: Store): void;
export function conversationTitle(stateText: string): string;
export function createConversation(draft: Draft, turn: Turn): Conversation;

export function isAuthBypass(): boolean;
```

`loadStore` returns `empty` store when JSON is missing or invalid. `saveStore` JSON-stringifies. Title rules are in the spec.

`ThemeProvider` exposes `{ preference, setPreference }` where preference is `'light' | 'dark' | 'system'`. `setPreference` writes `jev.theme` and updates the `dark` class immediately.

`AuthProvider` exposes `{ bypass, isAuthenticated, isLoading, getAccessToken, signIn, signOut }`. In bypass mode, `isAuthenticated` is true, `isLoading` is false, and `getAccessToken` resolves `undefined`.

`AppShell` uses Catalyst `Sidebar`, `SidebarHeader`, `SidebarBody`, `SidebarFooter`, `SidebarItem`, `SidebarLabel`, `SidebarHeading`, `SidebarSection`, `Navbar`, `NavbarItem`, `Button`. Desktop sidebar is `w-64` and `max-lg:hidden`. Mobile sidebar is a Headless dialog closed on pathname change. New chat navigates to `/`.

- [x] **Step 1: Write storage tests with an in-memory `getItem`/`setItem` map:**
  - Missing key returns an empty conversation list and an empty draft (`model === 'jev-latest'`, no questions).
  - Round-trip preserves a conversation title and one turn.
  - Invalid JSON returns the empty store.
  - `conversationTitle` uses the first non-empty line, caps at 60 characters plus `…`, and returns `Untitled` for whitespace.

- [x] **Step 2: Run the test, confirm failure, implement, confirm pass.**

- [x] **Step 3: Implement theme, auth, pages, and shell. `main.tsx` wraps `ThemeProvider` then `AuthProvider` then `BrowserRouter` and `App` routes.**

- [x] **Step 4: Commit.**

```bash
git add src/storage src/theme src/auth src/pages src/components/shell src/App.tsx src/main.tsx
git commit -m "feat: add shell, theme, local conversations, and Logto bypass"
```

Review checkpoint: with no env file, `/sign-in` does not construct `LogtoProvider`. `git ls-files src/components/catalyst` is empty.

### Task 6: Composer, question cards, upload dialog, answers

**Files:**

- Create: `src/components/chat/ChatView.tsx`, `src/components/chat/Composer.tsx`, `src/components/chat/QuestionCard.tsx`, `src/components/chat/UploadDialog.tsx`, `src/components/chat/TurnList.tsx`, `src/components/chat/AnswerCard.tsx`, `src/components/chat/ProbabilityBar.tsx`, `src/components/chat/NoulGauge.tsx`, `src/components/chat/ConfidenceBadge.tsx`, `src/components/chat/EmptyState.tsx`, `src/components/chat/example.ts`
- Modify: `src/App.tsx` to render `ChatView` inside the shell for `/` and `/c/:conversationId`

**Interfaces:**

- Consumes: validation, parser, `buildSystemOneRequest`, `createClientFromEnv`, store, auth `getAccessToken`.
- Produces: the chat screen described in the spec's UI and Upload sections.

- [x] **Step 1: Implement presentational pieces (`ProbabilityBar`, `NoulGauge`, `ConfidenceBadge`, `AnswerCard`) against the answer types. No new unit tests; behavior is covered by the mock tests plus the manual checkpoint.**

- [x] **Step 2: Implement `QuestionCard` as a controlled component. Reorder with buttons named "Move up" and "Move down". Add entry disabled at 100. Counter text `{n} / 100`.**

- [x] **Step 3: Implement `UploadDialog` with Interpret, stale detection, append/replace, and Add disabled on parser or validation errors.**

- [x] **Step 4: Implement `Composer` and `ChatView`. Submit builds the request, calls `client.evaluate` with the access token and an `AbortController`, appends an ok or error turn, and resets the draft only on success. Ctrl/Cmd+Enter submits.**

- [x] **Step 5: `npx vitest run` passes (domain and API tests still green).**

- [x] **Step 6: Commit.**

```bash
git add src/components/chat src/App.tsx
git commit -m "feat: add Jev composer, upload preview, and typed answers"
```

Review checkpoint: walk the spec UI section. Upload Add cannot fire before Interpret. A Choice with no options shows a line-numbered error and Add is disabled.

### Task 7: Docs, lint, build

**Files:**

- Create: `README.md`, `AGENTS.md`, `docs/backend-contract.md`
- Modify: `index.html` font weights to `400;500;600;700` if the earlier file used non-standard weights.

- [x] **Step 1: Write the three docs from the spec's "Docs to ship" section. README includes the Catalyst copy steps and the link patch command. AGENTS.md includes the do-not-commit rule and how to add a question type (types, draft, validation, parser mode, card, answer view, mock).**

- [x] **Step 2: Run `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build`.**

- [x] **Step 3: Format with Prettier if lint or format-check fails, then re-run.**

- [x] **Step 4: Commit docs and any format fixes.**

```bash
git add README.md AGENTS.md docs index.html
git commit -m "docs: describe setup, API contract, and agent guidance"
```

Review checkpoint: `git ls-files` contains neither `src/components/catalyst` nor a zip. README mentions FastAPI as the next step.

### Task 8: Browser verification and screenshots

**Files:** none expected.

- [x] **Step 1: `npm run dev` and open the app.**

- [x] **Step 2: Load the example, submit, and confirm Choice bars, Score, and Noul gauge. Toggle dark mode. Narrow to a mobile width and open the sidebar.**

- [x] **Step 3: Upload the spec's Choice sample, confirm the preview, then a Choice question with no options and confirm Add stays disabled and the line number is visible.**

- [x] **Step 4: Save screenshots under `/opt/cursor/artifacts/`: desktop light, desktop dark, mobile, upload preview.**

- [x] **Step 5: Push `cursor/jev-system-one-ui-85c7` and open a pull request against `main`.**

Review checkpoint: the PR body links the spec and lists how to run mock mode. Catalyst files are absent from the diff (`git diff --name-only origin/main`).
