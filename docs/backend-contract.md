# Backend contract

The browser never calls TypeSafe directly. When `VITE_API_MODE=http`, it calls our FastAPI service, which will hold the TypeSafe API key and proxy Jev.

## Endpoint

`POST {VITE_API_BASE_URL}/v1/systemone`

No trailing slash on the base URL. The client strips one if it is present.

### Headers

| Header          | Required                              | Value                   |
| --------------- | ------------------------------------- | ----------------------- |
| `Content-Type`  | yes                                   | `application/json`      |
| `Authorization` | when the user is signed in with Logto | `Bearer <access token>` |

The access token is the Logto token for `VITE_LOGTO_RESOURCE`. Mock mode and the auth bypass send no `Authorization` header.

The browser does not send `TypeSafe-Danger-Zone-Images` or `TypeSafe-Danger-Zone-Long-Context`. Box questions and image assets are out of scope.

### Body

`SystemOneRequest`, matching the TypeSafe System One schema:

```json
{
  "model": "jev-latest",
  "state": "I was charged twice. Please refund the extra charge.",
  "questions": {
    "billing": {
      "type": "noul",
      "instructions": "Is this message about billing?"
    },
    "tone": {
      "type": "choice",
      "instructions": "What is the tone of this message?",
      "criteria": {
        "angry": "An upset or hostile message",
        "calm": null
      }
    },
    "urgency": {
      "type": "score",
      "instructions": "How urgent is this message?",
      "criteria": ["Can wait", "Needs attention this week", "Needs attention today"]
    }
  }
}
```

`state` is a string, a JSON object, or a JSON array. Choice criteria values are strings or `null`. Score criteria are ordered level strings, index 0 is the low end. Noul `criteria` is omitted when both sides are blank; otherwise it is `{ "true"?: string, "false"?: string }`.

Question ids are the object keys. The UI only emits ids matching `^[A-Za-z][A-Za-z0-9_-]{0,63}$`.

### Success

`200` with `SystemOneResponse`:

```json
{
  "model": "jev-1.13.0",
  "answers": {
    "billing": { "type": "noul", "noul": 0.98 },
    "tone": {
      "type": "choice",
      "choice": "calm",
      "confidence": 0.7,
      "probabilities": { "angry": 0.15, "calm": 0.8, "excited": 0.05 }
    },
    "urgency": {
      "type": "score",
      "score": 1.7,
      "confidence": 0.55,
      "legend": { "0": "Can wait", "1": "Needs attention this week", "2": "Needs attention today" },
      "probabilities": { "0": 0.1, "1": 0.1, "2": 0.8 }
    }
  },
  "usage": { "input_tokens": 120, "output_tokens": 12 }
}
```

Answer keys match the question keys. Probabilities for one question sum to 1. `model` may be a resolved name rather than the alias that was sent.

### Errors

Use the TypeSafe status codes so the UI can show them:

| Status | When                                                                                        |
| ------ | ------------------------------------------------------------------------------------------- |
| 400    | Body breaks a request rule (bad UTF-8, nesting, non-finite numbers, context length).        |
| 401    | Missing or invalid caller credentials. Logto failures should use this.                      |
| 413    | Body over 32 MiB.                                                                           |
| 415    | Unsupported `Content-Encoding`.                                                             |
| 422    | Schema validation. Body is `{ "detail": ValidationError[] }` with `loc`, `msg`, and `type`. |
| 429    | Rate limit.                                                                                 |
| 529    | Upstream overloaded.                                                                        |

`400` may use `{ "detail": "<string>" }` or `{ "detail": { "message": "<string>" } }`. The client prints a string `detail`, a `message` field, or `loc` + `msg` entries joined by `; `.

The service should validate the Logto access token, then call `https://api.typesafe.ai/v1/systemone` with the server-side TypeSafe API key. Do not return that key to the browser.
