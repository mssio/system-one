export const MAX_ENTRIES = 100;
export const MIN_SCORE_ENTRIES = 2;
export const SCORE_API_MAX = 10;
export const QUESTION_ID_PATTERN = /^[A-Za-z][A-Za-z0-9_-]{0,63}$/;

export type QuestionType = 'choice' | 'score' | 'noul';
export type StateMode = 'text' | 'json';

export type DraftEntry = {
  key: string;
  text: string;
  description: string;
  sourceLine?: number;
};

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

export function createEntry(text = '', sourceLine?: number): DraftEntry {
  const entry: DraftEntry = {
    key: crypto.randomUUID(),
    text,
    description: '',
  };
  if (sourceLine !== undefined) {
    entry.sourceLine = sourceLine;
  }
  return entry;
}

export function createQuestion(type: QuestionType, existingIds: readonly string[]): DraftQuestion {
  let index = 1;
  while (existingIds.includes(`${type}_${index}`)) {
    index += 1;
  }
  return {
    key: crypto.randomUUID(),
    id: `${type}_${index}`,
    type,
    instructions: '',
    entries: type === 'noul' ? [] : [createEntry(), createEntry()],
    yesMeans: '',
    noMeans: '',
  };
}

export function emptyDraft(): Draft {
  return {
    stateMode: 'text',
    stateText: '',
    model: 'jev-latest',
    questions: [],
  };
}

export function stripSourceLines(question: DraftQuestion, id = question.id): DraftQuestion {
  return {
    key: question.key,
    id,
    type: question.type,
    instructions: question.instructions,
    yesMeans: question.yesMeans,
    noMeans: question.noMeans,
    entries: question.entries.map((entry) => ({
      key: entry.key,
      text: entry.text,
      description: entry.description,
    })),
  };
}

export function dedupeQuestionIds(
  questions: readonly DraftQuestion[],
  existingIds: readonly string[],
): DraftQuestion[] {
  const used = new Set(existingIds);
  return questions.map((question) => {
    const preferred = question.id.trim();
    let id = preferred;
    const preferredOk = QUESTION_ID_PATTERN.test(preferred) && !used.has(preferred);
    if (!preferredOk) {
      const stem = QUESTION_ID_PATTERN.test(preferred) ? preferred : question.type;
      let suffix = 2;
      id = `${stem}_${suffix}`;
      while (used.has(id) || !QUESTION_ID_PATTERN.test(id)) {
        suffix += 1;
        id = `${stem}_${suffix}`;
      }
    }
    used.add(id);
    return stripSourceLines(question, id);
  });
}
