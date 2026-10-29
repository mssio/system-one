import {
  MAX_ENTRIES,
  MIN_SCORE_ENTRIES,
  QUESTION_ID_PATTERN,
  SCORE_API_MAX,
  type Draft,
  type DraftEntry,
  type DraftQuestion,
  type StateMode,
} from './questions';

export type ValidationIssue = {
  severity: 'error' | 'warning';
  message: string;
  questionKey?: string;
  entryKey?: string;
  field?: 'id' | 'instructions' | 'entries' | 'state' | 'model' | 'yesMeans' | 'noMeans';
  line?: number;
};

export function hasErrors(issues: readonly { severity: string }[]): boolean {
  return issues.some((issue) => issue.severity === 'error');
}

export function validateDraft(draft: Draft): ValidationIssue[] {
  return [
    ...validateModel(draft.model),
    ...validateState(draft.stateMode, draft.stateText),
    ...validateQuestions(draft.questions),
  ];
}

export function validateModel(model: string): ValidationIssue[] {
  if (model.trim().length === 0) {
    return [{ severity: 'error', field: 'model', message: 'Choose a model name.' }];
  }
  return [];
}

export function validateState(mode: StateMode, raw: string): ValidationIssue[] {
  if (mode === 'text') {
    if (raw.trim().length === 0) {
      return [{ severity: 'error', field: 'state', message: 'State is required.' }];
    }
    return [];
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return [{ severity: 'error', field: 'state', message: 'State is not valid JSON.' }];
  }

  if (typeof parsed === 'string' || Array.isArray(parsed)) {
    return [];
  }
  if (parsed !== null && typeof parsed === 'object') {
    return [];
  }
  return [
    {
      severity: 'error',
      field: 'state',
      message: 'JSON state must be a string, object, or array.',
    },
  ];
}

export function validateQuestions(questions: readonly DraftQuestion[]): ValidationIssue[] {
  if (questions.length === 0) {
    return [{ severity: 'error', message: 'Add at least one question.' }];
  }

  const issues: ValidationIssue[] = [];
  const seenIds = new Set<string>();

  for (const question of questions) {
    const id = question.id.trim();
    if (!QUESTION_ID_PATTERN.test(id)) {
      issues.push({
        severity: 'error',
        message: 'Use an id that starts with a letter and contains only letters, numbers, _ or -.',
        questionKey: question.key,
        field: 'id',
        line: question.sourceLine,
      });
    } else if (seenIds.has(id)) {
      issues.push({
        severity: 'error',
        message: `Question id "${id}" is already used in this request.`,
        questionKey: question.key,
        field: 'id',
        line: question.sourceLine,
      });
    } else {
      seenIds.add(id);
    }

    if (question.instructions.trim().length === 0) {
      issues.push({
        severity: 'error',
        message: 'Instructions are required.',
        questionKey: question.key,
        field: 'instructions',
        line: question.sourceLine,
      });
    }

    if (question.type === 'noul') {
      issues.push(...validateNoul(question));
    } else {
      issues.push(...validateEntries(question));
    }
  }

  return issues;
}

function validateNoul(question: DraftQuestion): ValidationIssue[] {
  const yes = question.yesMeans.trim();
  const no = question.noMeans.trim();
  if (yes.length > 0 && no.length === 0) {
    return [
      {
        severity: 'warning',
        message: 'No-means is empty. The model will only see the yes criterion.',
        questionKey: question.key,
        field: 'noMeans',
        line: question.sourceLine,
      },
    ];
  }
  if (no.length > 0 && yes.length === 0) {
    return [
      {
        severity: 'warning',
        message: 'Yes-means is empty. The model will only see the no criterion.',
        questionKey: question.key,
        field: 'yesMeans',
        line: question.sourceLine,
      },
    ];
  }
  return [];
}

function validateEntries(question: DraftQuestion): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const noun = question.type === 'choice' ? 'option' : 'level';
  const count = question.entries.length;

  if (question.type === 'choice' && count < 1) {
    issues.push({
      severity: 'error',
      message: 'Choice questions need at least one option.',
      questionKey: question.key,
      field: 'entries',
      line: question.sourceLine,
    });
  }

  if (question.type === 'score' && count < MIN_SCORE_ENTRIES) {
    issues.push({
      severity: 'error',
      message: 'Score questions need at least two levels.',
      questionKey: question.key,
      field: 'entries',
      line: question.sourceLine,
    });
  }

  if (count > MAX_ENTRIES) {
    issues.push({
      severity: 'error',
      message: `This question has ${count} ${noun}s. The maximum is ${MAX_ENTRIES}.`,
      questionKey: question.key,
      field: 'entries',
      line: question.entries[MAX_ENTRIES]?.sourceLine ?? question.sourceLine,
    });
  } else if (question.type === 'score' && count > SCORE_API_MAX) {
    issues.push({
      severity: 'warning',
      message: `TypeSafe currently accepts at most ${SCORE_API_MAX} score levels. This rubric has ${count}.`,
      questionKey: question.key,
      field: 'entries',
      line: question.sourceLine,
    });
  }

  const seen = new Map<string, string>();
  for (const entry of question.entries) {
    issues.push(...validateEntry(question, entry, noun, seen));
  }
  return issues;
}

function validateEntry(
  question: DraftQuestion,
  entry: DraftEntry,
  noun: string,
  seen: Map<string, string>,
): ValidationIssue[] {
  const text = entry.text.trim();
  if (text.length === 0) {
    return [
      {
        severity: 'error',
        message: `This ${noun} is empty.`,
        questionKey: question.key,
        entryKey: entry.key,
        field: 'entries',
        line: entry.sourceLine,
      },
    ];
  }

  const folded = text.toLowerCase();
  const previous = seen.get(folded);
  seen.set(folded, text);
  if (previous === undefined) {
    return [];
  }

  const message =
    previous === text
      ? `Duplicate ${noun} "${text}".`
      : `"${text}" duplicates an earlier ${noun} ignoring case.`;
  return [
    {
      severity: 'error',
      message,
      questionKey: question.key,
      entryKey: entry.key,
      field: 'entries',
      line: entry.sourceLine,
    },
  ];
}
