import type { SystemOneClient } from './client';
import { SystemOneError } from './errors';
import type { Answer, ChoiceAnswer, ScoreAnswer, SystemOneRequest } from './types';

const SIMULATE_ERROR = '[simulate-error]';
const OVERLOAD_CHANCE = 0.08;

export function createMockClient(options?: {
  delayMs?: number;
  random?: () => number;
}): SystemOneClient {
  const delayMs = options?.delayMs ?? 700;
  const random = options?.random ?? Math.random;

  return {
    async evaluate(request, init) {
      await wait(delayMs, init?.signal);
      if (containsSimulateError(request.state)) {
        throw new SystemOneError('The request failed validation.', 422, {
          detail: [
            {
              loc: ['body', 'state'],
              msg: 'Simulated validation error',
              type: 'value_error',
            },
          ],
        });
      }
      if (random() < OVERLOAD_CHANCE) {
        throw new SystemOneError('TypeSafe is temporarily overloaded.', 529);
      }

      const answers: Record<string, Answer> = {};
      for (const [id, question] of Object.entries(request.questions)) {
        const seed = hashString(`${stable(request.state)}|${id}|${question.instructions ?? ''}`);
        if (question.type === 'choice') {
          answers[id] = choiceAnswer(Object.keys(question.criteria), seed);
        } else if (question.type === 'score') {
          answers[id] = scoreAnswer(question.criteria, seed);
        } else {
          answers[id] = { type: 'noul', noul: round3(unit(seed)) };
        }
      }

      const usageSeed = hashString(stable(request.state));
      return {
        model: request.model === 'jev-latest' ? 'jev-1.13.0' : request.model,
        answers,
        usage: {
          input_tokens: 80 + (usageSeed % 400),
          output_tokens: 8 + Object.keys(request.questions).length * 6,
        },
      };
    },
  };
}

function choiceAnswer(names: string[], seed: number): ChoiceAnswer {
  const probabilities = assign(names, seed);
  const choice = argmax(probabilities);
  return {
    type: 'choice',
    choice,
    confidence: confidence(Object.values(probabilities)),
    probabilities,
  };
}

function scoreAnswer(levels: string[], seed: number): ScoreAnswer {
  const keys = levels.map((_, index) => String(index));
  const probabilities = assign(keys, seed);
  const values = keys.map((key) => probabilities[key] ?? 0);
  const legend: Record<string, string> = {};
  levels.forEach((level, index) => {
    legend[String(index)] = level;
  });
  return {
    type: 'score',
    score: values.reduce((sum, value, index) => sum + value * index, 0),
    confidence: confidence(values),
    legend,
    probabilities,
  };
}

function assign(keys: string[], seed: number): Record<string, number> {
  if (keys.length === 0) return {};
  let state = seed || 1;
  const weights = keys.map(() => {
    state = mix(state);
    return (state % 1000) / 1000 + 0.05;
  });
  const winner = seed % keys.length;
  weights[winner] = (weights[winner] ?? 0) + 1.5;
  const normalized = normalize(weights);
  const record: Record<string, number> = {};
  keys.forEach((key, index) => {
    record[key] = normalized[index] ?? 0;
  });
  return record;
}

function normalize(weights: number[]): number[] {
  const total = weights.reduce((sum, value) => sum + value, 0);
  const rounded = weights.map((value) => Math.round((value / total) * 1000) / 1000);
  const drift = Math.round((1 - rounded.reduce((sum, value) => sum + value, 0)) * 1000) / 1000;
  let maxIndex = 0;
  rounded.forEach((value, index) => {
    if (value > (rounded[maxIndex] ?? 0)) maxIndex = index;
  });
  rounded[maxIndex] = Math.round(((rounded[maxIndex] ?? 0) + drift) * 1000) / 1000;
  return rounded;
}

function confidence(probs: number[]): number {
  if (probs.length <= 1) return 1;
  let entropy = 0;
  for (const probability of probs) {
    if (probability > 0) entropy -= probability * Math.log(probability);
  }
  const value = 1 - entropy / Math.log(probs.length);
  return round3(Math.min(1, Math.max(0, value)));
}

function argmax(probabilities: Record<string, number>): string {
  let bestKey = '';
  let best = -1;
  for (const [key, value] of Object.entries(probabilities)) {
    if (value > best) {
      best = value;
      bestKey = key;
    }
  }
  return bestKey;
}

function containsSimulateError(state: SystemOneRequest['state']): boolean {
  if (typeof state === 'string') return state.includes(SIMULATE_ERROR);
  return JSON.stringify(state).includes(SIMULATE_ERROR);
}

function stable(state: SystemOneRequest['state']): string {
  return typeof state === 'string' ? state : JSON.stringify(state);
}

function hashString(input: string): number {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mix(value: number): number {
  let next = value ^ (value >>> 16);
  next = Math.imul(next, 2246822519);
  return next >>> 0;
}

function unit(seed: number): number {
  return (seed % 10001) / 10000;
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

async function wait(delayMs: number, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) throw abortError();
  if (delayMs <= 0) return;
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, delayMs);
    const onAbort = () => {
      clearTimeout(timer);
      reject(abortError());
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

function abortError(): DOMException {
  return new DOMException('The operation was aborted.', 'AbortError');
}
