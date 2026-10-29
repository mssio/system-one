import { describe, expect, it } from 'vitest';
import { createQuestion, type DraftQuestion } from './questions';
import {
  hasErrors,
  validateDraft,
  validateModel,
  validateQuestions,
  validateState,
} from './validation';

function choice(partial: Partial<DraftQuestion> = {}): DraftQuestion {
  return {
    key: 'k1',
    id: 'tone',
    type: 'choice',
    instructions: 'What is the tone?',
    entries: [{ key: 'e1', text: 'calm', description: '' }],
    yesMeans: '',
    noMeans: '',
    ...partial,
  };
}

describe('validateQuestions', () => {
  it('accepts a choice with one named option', () => {
    expect(validateQuestions([choice()])).toEqual([]);
  });

  it('errors when a choice has no options and keeps the source line', () => {
    const issues = validateQuestions([choice({ entries: [], sourceLine: 4 })]);
    expect(issues).toEqual([
      expect.objectContaining({
        severity: 'error',
        questionKey: 'k1',
        field: 'entries',
        line: 4,
      }),
    ]);
  });

  it('errors on the 101st choice option', () => {
    const entries = Array.from({ length: 101 }, (_, index) => ({
      key: `e${index}`,
      text: `option ${index}`,
      description: '',
      sourceLine: index === 100 ? 80 : undefined,
    }));
    const issues = validateQuestions([choice({ entries })]);
    expect(issues).toEqual([
      expect.objectContaining({ severity: 'error', line: 80, field: 'entries' }),
    ]);
  });

  it('errors on a blank choice name and a case-insensitive duplicate', () => {
    const issues = validateQuestions([
      choice({
        entries: [
          { key: 'a', text: '  ', description: '' },
          { key: 'b', text: 'Calm', description: '' },
          { key: 'c', text: 'calm', description: '', sourceLine: 9 },
        ],
      }),
    ]);
    expect(issues.map((issue) => issue.entryKey)).toEqual(['a', 'c']);
    expect(issues.every((issue) => issue.severity === 'error')).toBe(true);
    expect(issues[1]?.line).toBe(9);
  });

  it('requires two score levels, warns above 10, and errors above 100', () => {
    const one = validateQuestions([
      {
        key: 's',
        id: 'severity',
        type: 'score',
        instructions: 'How severe?',
        entries: [{ key: 'a', text: 'Low', description: '' }],
        yesMeans: '',
        noMeans: '',
        sourceLine: 2,
      },
    ]);
    expect(one).toEqual([expect.objectContaining({ severity: 'error', line: 2 })]);

    const two = validateQuestions([
      {
        key: 's',
        id: 'severity',
        type: 'score',
        instructions: 'How severe?',
        entries: [
          { key: 'a', text: 'Low', description: '' },
          { key: 'b', text: 'High', description: '' },
        ],
        yesMeans: '',
        noMeans: '',
      },
    ]);
    expect(two).toEqual([]);

    const eleven = Array.from({ length: 11 }, (_, index) => ({
      key: `e${index}`,
      text: `level ${index}`,
      description: '',
    }));
    const warned = validateQuestions([
      {
        key: 's',
        id: 'severity',
        type: 'score',
        instructions: 'How severe?',
        entries: eleven,
        yesMeans: '',
        noMeans: '',
      },
    ]);
    expect(warned).toEqual([expect.objectContaining({ severity: 'warning' })]);
    expect(hasErrors(warned)).toBe(false);

    const tooMany = Array.from({ length: 101 }, (_, index) => ({
      key: `e${index}`,
      text: `level ${index}`,
      description: '',
      sourceLine: index === 100 ? 50 : undefined,
    }));
    const errored = validateQuestions([
      {
        key: 's',
        id: 'severity',
        type: 'score',
        instructions: 'How severe?',
        entries: tooMany,
        yesMeans: '',
        noMeans: '',
      },
    ]);
    expect(errored.some((issue) => issue.severity === 'error' && issue.line === 50)).toBe(true);
  });

  it('rejects duplicate and illegal ids and accepts a legal id', () => {
    const base = choice();
    const duplicate = validateQuestions([base, choice({ key: 'k2', id: 'tone' })]);
    expect(duplicate.some((issue) => issue.field === 'id' && issue.questionKey === 'k2')).toBe(
      true,
    );

    const illegal = validateQuestions([choice({ id: '1bad' })]);
    expect(illegal).toEqual([expect.objectContaining({ field: 'id', severity: 'error' })]);

    expect(validateQuestions([choice({ id: 'ok_id-1' })])).toEqual([]);
  });

  it('requires instructions', () => {
    expect(validateQuestions([choice({ instructions: '   ' })])).toEqual([
      expect.objectContaining({ field: 'instructions', severity: 'error' }),
    ]);
  });

  it('warns when only one noul criterion is set', () => {
    const blank = validateQuestions([
      {
        key: 'n',
        id: 'billing',
        type: 'noul',
        instructions: 'Is this about billing?',
        entries: [],
        yesMeans: '',
        noMeans: '',
      },
    ]);
    expect(blank).toEqual([]);

    const partial = validateQuestions([
      {
        key: 'n',
        id: 'billing',
        type: 'noul',
        instructions: 'Is this about billing?',
        entries: [],
        yesMeans: 'A billing request',
        noMeans: '',
      },
    ]);
    expect(partial).toEqual([
      expect.objectContaining({ severity: 'warning', field: 'noMeans', questionKey: 'n' }),
    ]);
  });

  it('errors when there are no questions', () => {
    expect(validateQuestions([])).toEqual([expect.objectContaining({ severity: 'error' })]);
  });
});

describe('validateState and validateModel', () => {
  it('rejects blank text and accepts json string, object, and array', () => {
    expect(validateState('text', '   ')).toEqual([
      expect.objectContaining({ field: 'state', severity: 'error' }),
    ]);
    expect(validateState('json', '{"a":1}')).toEqual([]);
    expect(validateState('json', '"hi"')).toEqual([]);
    expect(validateState('json', '[1]')).toEqual([]);
    expect(validateState('json', '1').some((issue) => issue.severity === 'error')).toBe(true);
    expect(validateState('json', 'null').some((issue) => issue.severity === 'error')).toBe(true);
    expect(validateState('json', '{').some((issue) => issue.severity === 'error')).toBe(true);
  });

  it('rejects a blank model', () => {
    expect(validateModel('  ')).toEqual([
      expect.objectContaining({ field: 'model', severity: 'error' }),
    ]);
    expect(validateModel('jev-latest')).toEqual([]);
  });
});

describe('validateDraft', () => {
  it('combines model, state, and question issues', () => {
    const question = createQuestion('noul', []);
    const issues = validateDraft({
      stateMode: 'text',
      stateText: '',
      model: '',
      questions: [question],
    });
    expect(issues.some((issue) => issue.field === 'state')).toBe(true);
    expect(issues.some((issue) => issue.field === 'model')).toBe(true);
    expect(issues.some((issue) => issue.field === 'instructions')).toBe(true);
  });
});

describe('createQuestion', () => {
  it('names questions from the type and skips used ids', () => {
    const first = createQuestion('choice', []);
    expect(first.id).toBe('choice_1');
    expect(first.entries).toHaveLength(2);
    const second = createQuestion('choice', [first.id]);
    expect(second.id).toBe('choice_2');
    expect(createQuestion('noul', []).entries).toEqual([]);
  });
});
