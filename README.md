# Jev

A static chat-style workspace for [TypeSafe](https://docs.typesafe.ai/introduction) System One, aimed at the Jev model. A turn is not a free-text prompt. It is one piece of **state** plus any number of typed questions — Choice, Score, and Noul — judged in parallel. Answers come back as probabilities, a confidence value, or a 0–1 Noul.

The UI talks to a typed client. `VITE_API_MODE=mock` (the default) answers locally. `VITE_API_MODE=http` posts to a FastAPI proxy that does not exist yet. See [docs/backend-contract.md](docs/backend-contract.md).

Box questions and image assets are out of scope.

## Features

- Composer for text or JSON state, a model name, and a stack of mixed questions.
- Choice options and Score levels can be added, removed, and reordered, up to 100, with live counts and validation.
- Noul questions have optional yes-means and no-means criteria.
- Upload or paste a `.txt` file of many questions of one type, preview the parsed cards with line-numbered errors and warnings, then add them.
- Rich results: probability bars, a selected badge, a confidence badge, and a Noul gauge.
- Sidebar history stored in `localStorage`.
- Light, dark, and system themes.
- Logto sign-in, callback, and sign-out routes. Mock mode, or missing Logto env vars, skips auth.

## Setup

Requirements: Node.js 22+.

```bash
npm install
```

### Catalyst UI kit

The Tailwind Plus Catalyst components are **not in git**. Copy the TypeScript kit from your own Tailwind Plus account:

1. Download the Catalyst UI kit.
2. Copy every file from `catalyst-ui-kit/typescript/` into `src/components/catalyst/`.
3. Point `Link` at React Router:

```bash
node scripts/patch-catalyst-link.mjs
```

Re-run the patch after you replace the kit. `src/components/catalyst/` is gitignored. Do not commit those files or the zip.

### Environment

```bash
cp .env.example .env.local
```

| Variable              | Purpose                                                       |
| --------------------- | ------------------------------------------------------------- |
| `VITE_API_MODE`       | `mock` (default) or `http`.                                   |
| `VITE_API_BASE_URL`   | Origin of the FastAPI proxy, no path. Used only in http mode. |
| `VITE_LOGTO_ENDPOINT` | Logto tenant endpoint.                                        |
| `VITE_LOGTO_APP_ID`   | Logto application id.                                         |
| `VITE_LOGTO_RESOURCE` | API resource / audience for the access token.                 |

Auth is bypassed when the mode is not `http`, or when the endpoint or app id is empty. Register `/callback` as a Logto redirect URI and `/` as a post-logout redirect when you turn auth on.

## Scripts

| Command          | What it does                                                                    |
| ---------------- | ------------------------------------------------------------------------------- |
| `npm run dev`    | Vite dev server.                                                                |
| `npm test`       | Vitest. Parser, validation, request builder, mock client, conversation storage. |
| `npm run lint`   | ESLint.                                                                         |
| `npm run build`  | `tsc --noEmit` and the production bundle.                                       |
| `npm run format` | Prettier.                                                                       |

## Mock and HTTP

Mock mode waits briefly, then returns deterministic probabilities that sum to 1. Putting `[simulate-error]` in the state returns a 422. About 8% of other calls return 529 so the error path is visible.

HTTP mode `POST`s the same JSON to `{VITE_API_BASE_URL}/v1/systemone` and sends the Logto access token when it has one.

## Upload text

One upload is many questions of **one** type. Blank lines, extra whitespace, Windows newlines, and both `1.` / `1)` and `a.` / `a)` markers are accepted.

Noul:

```
1. Is 1+1 = 2?
2. is 2+2 = 4?
3. is 3+3 = 6?
```

Choice, and Score (the lettered lines are ordered levels):

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

Interpret the text before it can be added. Errors block adding. Warnings, including a Score rubric longer than the current API limit of 10 levels, do not.

## Project structure

```
src/domain        question drafts, validation, upload parser
src/api           System One types, request builder, mock and HTTP clients
src/auth          Logto provider and the dev bypass
src/storage       localStorage conversations
src/theme         light / dark / system
src/components    shell and chat UI (imports Catalyst)
src/pages         sign-in, callback, sign-out
docs/specs        product spec
docs/plans        implementation plan
```

## Roadmap

The next piece is the FastAPI backend: verify the Logto token, proxy `POST /v1/systemone` to TypeSafe with a server-side API key, and pass status codes through unchanged.

## Design notes

Choice is capped at 100 options in this app even though the TypeSafe API allows 255. Score requires two levels, as the Score docs recommend, and warns above 10 because that is the API maximum. The product cap of 100 still applies so a long rubric can be edited in mock mode.
