import type { Draft, DraftQuestion, StateMode } from '../domain/questions';
import { hasErrors, validateDraft } from '../domain/validation';
import { SystemOneError } from './errors';
import type { Question, StateValue, SystemOneRequest } from './types';

export function parseStateValue(mode: StateMode, raw: string): StateValue {
  if (mode === 'text') return raw;
  const parsed: unknown = JSON.parse(raw);
  if (typeof parsed === 'string' || Array.isArray(parsed)) return parsed;
  if (parsed !== null && typeof parsed === 'object') return parsed as Record<string, unknown>;
  throw new SystemOneError('JSON state must be a string, object, or array.', 0);
}

export function buildSystemOneRequest(draft: Draft): SystemOneRequest {
  const issues = validateDraft(draft);
  if (hasErrors(issues)) {
    const message =
      issues.find((issue) => issue.severity === 'error')?.message ?? 'Invalid request.';
    throw new SystemOneError(message, 0, issues);
  }

  const questions: Record<string, Question> = {};
  for (const question of draft.questions) {
    questions[question.id] = toQuestion(question);
  }

  return {
    model: draft.model.trim(),
    state: parseStateValue(draft.stateMode, draft.stateText),
    questions,
  };
}

function toQuestion(question: DraftQuestion): Question {
  const instructions = question.instructions.trim();
  if (question.type === 'choice') {
    const criteria: Record<string, string | null> = {};
    for (const entry of question.entries) {
      const description = entry.description.trim();
      criteria[entry.text.trim()] = description.length > 0 ? description : null;
    }
    return { type: 'choice', instructions, criteria };
  }
  if (question.type === 'score') {
    return {
      type: 'score',
      instructions,
      criteria: question.entries.map((entry) => entry.text.trim()),
    };
  }

  const yes = question.yesMeans.trim();
  const no = question.noMeans.trim();
  if (yes.length === 0 && no.length === 0) {
    return { type: 'noul', instructions };
  }
  return {
    type: 'noul',
    instructions,
    criteria: {
      ...(yes.length > 0 ? { true: yes } : {}),
      ...(no.length > 0 ? { false: no } : {}),
    },
  };
}
