# Jev System One UI — design spec

Date: 2026-10-29

Status: agreed. This spec records the product request. Implementation follows it.

## Summary

A static single-page app for asking TypeSafe's Jev model (a System One model) typed questions about one piece of state. A turn is not a free-text chat message. It is a state plus a stack of Choice, Score, and Noul questions, evaluated together. Answers render as probability bars, a confidence badge, or a 0–1 Noul gauge.

The app talks to a typed client. Today that client is a mock. Later the same interface calls a FastAPI proxy (not part of this spec).

## Non-goals

- Box questions, image assets, and the `TypeSafe-Danger-Zone-*` headers.
- Server-side rendering. The site is a Vite SPA.
- Committing the Tailwind Plus Catalyst UI kit. Those files stay gitignored.
- A real Logto tenant. Missing Logto env vars, or mock API mode, bypass auth.
- Structured JSON inside question instructions or criteria. The form edits strings. State itself may be text or JSON.

## Stack

- Vite, React 19, TypeScript (strict), React Router 7, Tailwind CSS v4.
- Vitest for parser, validation, request building, and the mock client.
- ESLint (typescript-eslint strict type-checked) and Prettier.
- Catalyst components from `src/components/catalyst/`, copied locally from the developer's Tailwind Plus account. `link.tsx` is patched to React Router by `scripts/patch-catalyst-link.mjs`.
- `@logto/react` for the real auth path.

## Information architecture

Routes:

| Path                 | Behavior                                                                        |
| -------------------- | ------------------------------------------------------------------------------- |
| `/`                  | New conversation. Composer bound to the unsaved draft.                          |
| `/c/:conversationId` | An existing conversation and its follow-up draft.                               |
| `/sign-in`           | Starts Logto sign-in. In bypass mode, explains that auth is off and links home. |
| `/callback`          | Logto redirect target. In bypass mode, redirects home.                          |
| `/sign-out`          | Clears the Logto session. In bypass mode, redirects home.                       |

Anything else redirects to `/`.

The shell is a chat layout: a conversation sidebar (drawer below the `lg` breakpoint) and a column with the turn history above a docked composer. Sidebar collapse on small screens uses a dialog, following Catalyst's `SidebarLayout` pattern, implemented in our shell so the transcript can use the full height.

## Theme

Three preferences, stored in `localStorage` under `jev.theme`: `light`, `dark`, and `system` (default when unset). The resolved theme sets or removes the `dark` class on `<html>` and sets `color-scheme`. An inline script in `index.html` applies this before paint. Tailwind's `dark` variant is class-based (`@custom-variant dark (&:where(.dark, .dark *))`) so Catalyst `dark:` styles follow the toggle, including when the preference is system.

## Conversations

Persisted in `localStorage` under `jev.store.v1`.

```ts
type Store = {
  conversations: Conversation[];
  newDraft: Draft;
};

type Conversation = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  turns: Turn[];
  draft: Draft;
};

type Draft = {
  stateMode: 'text' | 'json';
  stateText: string;
  model: string;
  questions: DraftQuestion[];
};

type Turn = {
  id: string;
  createdAt: string;
  model: string;
  stateMode: 'text' | 'json';
  stateText: string;
  questions: DraftQuestion[];
  result:
    | { status: 'ok'; response: SystemOneResponse }
    | { status: 'error'; statusCode?: number; message: string };
};
```

- New chat (`/`) edits `newDraft` and does not appear in the sidebar until the first successful or failed submit creates a conversation.
- Opening a conversation edits that conversation's follow-up `draft`.
- The title is the first non-empty line of the first turn's state, trimmed, at most 60 characters, with an ellipsis if truncated. Empty fallback: "Untitled".
- Delete removes the conversation and returns to `/` when it was open.
- A failed submit appends an error turn and leaves the draft in place. A successful submit appends the turn and resets that draft to empty.

## Question draft

```ts
type QuestionType = 'choice' | 'score' | 'noul';

type DraftEntry = {
  key: string;
  text: string;
  description: string;
  sourceLine?: number;
};

type DraftQuestion = {
  key: string;
  id: string;
  type: QuestionType;
  instructions: string;
  entries: DraftEntry[];
  yesMeans: string;
  noMeans: string;
  sourceLine?: number;
};
```

- Users add and remove questions of mixed types in one request.
- Each question has an editable id. New ids are `{type}_{n}` (`choice_1`), skipping ids already used.
- Choice and Score entries can be added, removed, and reordered with up/down buttons (keyboard accessible). Drag-and-drop is out of scope.
- Choice entries have a required name (`text`) and an optional description.
- Score entries have a required level description (`text`), ordered from low to high. Description is unused.
- Noul has optional "yes means" and "no means" fields. It has no entries.
- A counter shows `{count} / 100` on Choice and Score.

## Validation

Errors block "Ask Jev" and block adding an upload into the composer. Warnings are shown and do not block.

Shared:

- At least one question.
- Id matches `^[A-Za-z][A-Za-z0-9_-]{0,63}$`, is unique in the request, and is non-empty.
- Instructions are required and non-blank after trim.
- Model is required and non-blank. Default `jev-latest`.

Choice (API: at least 1 option, at most 255). This app caps options at 100.

- Fewer than 1 option: error.
- More than 100 options: error.
- Blank name: error.
- Two names equal after trim: error.
- Two names equal ignoring case: error.

Score (docs: at least two levels; API accepts 1 through 10). This app caps levels at 100.

- Fewer than 2 levels: error. Message cites the Score docs.
- More than 100 levels: error.
- More than 10 and at most 100: warning. Message cites the API `maxItems` of 10. Submit stays enabled so mock mode can still demonstrate the rubric.
- Blank level text: error.
- Duplicate level text: same rules as Choice names.

Noul:

- Both criteria blank: omit `criteria` on the wire. No issue.
- One side filled and the other blank: warning.

State:

- Text mode: error if blank after trim. The request sends the original string (not trimmed) so indentation survives.
- JSON mode: must parse as a JSON string, object, or array. `null`, numbers, and booleans are errors. Invalid JSON is an error. The request sends the parsed value.

Field errors render on the control. A summary sits next to the submit button. Upload issues also carry a 1-based source line when the draft still has `sourceLine`.

## Upload format

One file or paste defines many questions of one type. The user picks `choice`, `score`, or `noul` before interpreting.

Noul:

```
1. Is 1+1 = 2?
2. is 2+2 = 4?
3. is 3+3 = 6?
```

Choice and Score. Lettered lines are options. For Score they are ordered levels.

```
1. what is 1+1?
a. 2
b. 3
c. 4
d. 5

2. what is 2+2?
a. 3
b. 4
c. 6
```

Parser rules:

- Strip a leading BOM. Normalize `\r\n` and `\r` to `\n`.
- Ignore blank lines.
- A question line matches `^\s*(\d+)\s*[.)]\s*(.*)$`.
- An option line matches `^\s*([A-Za-z])\s*[.)]\s*(.*)$`.
- Any other non-blank line continues the current option, or the current instructions if no option is open, joined with a single space.
- Noul does not take options. A lettered line warns and is appended to the instructions.
- An option before the first question is an error and is dropped.
- Content before the first question that is not an option warns and is dropped.
- Repeated question numbers warn. Ids are `q{n}`, then `q{n}_2`, `q{n}_3`, …
- Repeated option letters in one question warn. Both entries are kept.
- An empty file, or a file with no questions, is an error on line 1.
- The parser does not drop extra options. Validation reports the 101st entry using that entry's line number.
- Empty instructions, empty option text, duplicate text, and too few options are validation errors on the parsed draft, using `sourceLine`.

Upload dialog:

1. Choose the type.
2. Paste text or choose a `.txt` file (other text files are accepted; files over 1_000_000 bytes are rejected).
3. Press Interpret. The raw text is not sent anywhere.
4. Show line-numbered errors and warnings, then the parsed questions as normal editable cards.
5. Editing a card re-runs validation. Changing the source marks the preview stale and disables Add until Interpret is pressed again.
6. Add is enabled only when the preview is fresh, there is at least one question, and neither parser nor validation reports an error.
7. Add can append to the composer or replace it. New ids that collide with existing composer ids get a numeric suffix before they are inserted. `sourceLine` is cleared on insert so composer issues are not attributed to a file the user is no longer looking at.

## API

Types match the System One OpenAPI schema for `model`, `state`, `questions`, `answers`, and `usage`, including Choice, Score, Noul, and Box. The UI never sends Box or `assets`.

`POST {VITE_API_BASE_URL}/v1/systemone`

- Header `Content-Type: application/json`.
- Header `Authorization: Bearer <access token>` when the auth layer returns a token.
- Body: `SystemOneRequest`.
- `200`: `SystemOneResponse`.
- Error body: `{ "detail": string | object | ValidationError[] }` for 400 and 422, matching the TypeSafe error docs. The client surfaces `detail` when it is a string, a `message` field, or FastAPI/TypeSafe `loc` + `msg` entries.

Env:

- `VITE_API_MODE=mock` (default when unset) uses the mock.
- `VITE_API_MODE=http` uses HTTP. A missing base URL fails the call with a clear error.
- `VITE_LOGTO_ENDPOINT`, `VITE_LOGTO_APP_ID`, `VITE_LOGTO_RESOURCE`.

Wire mapping:

- Choice `criteria` is an object. Empty description becomes `null`.
- Score `criteria` is an array of strings in entry order.
- Noul `criteria` is omitted when both sides are blank. Otherwise `{ true, false }` includes each non-blank side.

Mock:

- Resolves after a short delay (default about 700ms). Tests inject `delayMs: 0`.
- Probabilities are deterministic from a hash of the canonical state, the question id, and the instructions. They sum to 1 after rounding to three decimals.
- The winning choice is the highest probability. Score is the probability-weighted level index. Confidence is `1 - entropy / log(n)`, clamped to 0..1, and is 1 when there is a single bin.
- Noul is a hash in 0..1. No confidence field.
- Legend keys are `"0"`, `"1"`, … and probabilities use the same keys.
- If the state text or its JSON serialization contains `[simulate-error]`, the mock rejects with HTTP 422 and a validation-shaped `detail`.
- Otherwise, when the injected `random()` (default `Math.random`) is below 0.08, the mock rejects with HTTP 529 and message "TypeSafe is temporarily overloaded."
- AbortSignal rejects with `AbortError`.

## Auth

Bypass when `VITE_API_MODE` is not `http`, or when endpoint or app id is missing. Bypass renders the app with no `LogtoProvider`. The shell shows "Local session".

When Logto is on:

- `LogtoProvider` wraps the router with `endpoint`, `appId`, and `resources: [VITE_LOGTO_RESOURCE]` when the resource is set.
- `/` and `/c/:id` require `isAuthenticated`. Otherwise redirect to `/sign-in`.
- Sign-in calls `signIn(window.location.origin + '/callback')`.
- Callback uses `useHandleSignInCallback` and then navigates to `/`.
- Sign-out calls `signOut(window.location.origin + '/')`.
- The API client receives `getAccessToken(VITE_LOGTO_RESOURCE)` when a resource is configured.

## UI

Visual language is Catalyst: zinc surfaces, Inter, blue focus rings, `dark:` pairs. Question types use fixed colors: Choice indigo, Score amber, Noul emerald. The selected option or level is filled, labeled "Selected", and not conveyed by color alone.

Composer:

- State format toggle (text / JSON), textarea, model field.
- Question cards with id, instructions, entries, counter, remove, move up, move down, add entry (disabled at 100).
- Add Choice / Score / Noul.
- Upload questions.
- Ask Jev. Disabled while a request is in flight or when validation has an error. Shortcut: Ctrl or Cmd + Enter.
- Helper text mentions `[simulate-error]` in mock mode.

Transcript:

- Each turn shows the state (expand when longer than 12 lines), the questions, and either rich answers or an error alert.
- Choice and Score: horizontal probability bars in criteria order, percent labels, confidence badge (High ≥ 0.75, Medium ≥ 0.45, otherwise Low).
- Score also shows the expected score and the legend text.
- Noul: a 0–1 meter with the value, ticks at 0.3 and 0.7, and a word (strong no, leaning no, uncertain, leaning yes, strong yes).
- Footer: returned model name and token counts.
- An unknown answer type, including Box, renders a short notice instead of a chart.
- The transcript region is a polite live region. The newest turn scrolls into view.

Empty `/` state explains what Jev does and offers "Load example": the duplicate-charge support message plus one Noul, one Choice, and one Score, taken from the System One docs.

Accessibility: every input has a visible label, icon buttons have accessible names, dialogs use Catalyst/Headless focus traps, and focus rings stay visible.

## Docs to ship

- `README.md` — what the app is, features, Catalyst install, env vars, scripts, mock vs http, upload format, project structure, backend contract summary, roadmap (FastAPI proxy next).
- `AGENTS.md` — architecture, where files live, Catalyst must not be committed, how to lint/test/build, API contract, Jev concepts, how to add a question type.
- `docs/backend-contract.md` — the endpoint the future FastAPI app must implement.
- This spec and `docs/plans/2026-10-29-jev-system-one-ui.md`.

## Acceptance

- `npm test`, `npm run lint`, and `npm run build` succeed with Catalyst present locally.
- `git ls-files` lists no file under `src/components/catalyst/` and no zip of the kit.
- Mock mode runs without Logto. A sample turn renders Choice bars, a Score, and a Noul gauge in light and dark, at desktop and mobile widths.
- An upload of the formats above previews editable cards and blocks Add when a Choice question has no options or more than 100 options.
