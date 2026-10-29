import { describe, expect, it } from 'vitest';
import type { DraftQuestion } from '../domain/questions';
import { buildSystemOneRequest } from './build-request';
import { SystemOneError } from './errors';

function question(partial: Partial<DraftQuestion>): DraftQuestion {
  return {
    key: 'k',
    id: 'q',
    type: 'noul',
    instructions: 'Is it true?',
    entries: [],
    yesMeans: '',
    noMeans: '',
    ...partial,
  };
}

describe('buildSystemOneRequest', () => {
  it('passes text state through, including leading spaces', () => {
    const request = buildSystemOneRequest({
      stateMode: 'text',
      stateText: '  hello',
      model: 'jev-latest',
      questions: [question({})],
    });
    expect(request.state).toBe('  hello');
    expect(request.model).toBe('jev-latest');
  });

  it('sends parsed json objects as objects', () => {
    const request = buildSystemOneRequest({
      stateMode: 'json',
      stateText: '{ "message": "hi" }',
      model: 'jev-latest',
      questions: [question({})],
    });
    expect(request.state).toEqual({ message: 'hi' });
  });

  it('maps choice descriptions and nulls', () => {
    const request = buildSystemOneRequest({
      stateMode: 'text',
      stateText: 'ticket',
      model: 'jev-latest',
      questions: [
        question({
          id: 'tone',
          type: 'choice',
          instructions: 'Tone?',
          entries: [
            { key: 'a', text: 'calm', description: 'Polite' },
            { key: 'b', text: 'angry', description: '   ' },
          ],
        }),
      ],
    });
    expect(request.questions.tone).toEqual({
      type: 'choice',
      instructions: 'Tone?',
      criteria: { calm: 'Polite', angry: null },
    });
  });

  it('keeps score levels in order', () => {
    const request = buildSystemOneRequest({
      stateMode: 'text',
      stateText: 'bug',
      model: 'jev-latest',
      questions: [
        question({
          id: 'severity',
          type: 'score',
          instructions: 'How severe?',
          entries: [
            { key: 'a', text: 'Low', description: '' },
            { key: 'b', text: 'High', description: '' },
          ],
        }),
      ],
    });
    expect(request.questions.severity).toEqual({
      type: 'score',
      instructions: 'How severe?',
      criteria: ['Low', 'High'],
    });
  });

  it('omits empty noul criteria and sends a partial object', () => {
    const omitted = buildSystemOneRequest({
      stateMode: 'text',
      stateText: 'hi',
      model: 'jev-latest',
      questions: [question({ id: 'billing' })],
    });
    expect(omitted.questions.billing).toEqual({
      type: 'noul',
      instructions: 'Is it true?',
    });

    const partial = buildSystemOneRequest({
      stateMode: 'text',
      stateText: 'hi',
      model: 'jev-latest',
      questions: [question({ id: 'billing', yesMeans: 'yes' })],
    });
    expect(partial.questions.billing).toEqual({
      type: 'noul',
      instructions: 'Is it true?',
      criteria: { true: 'yes' },
    });
  });

  it('throws when the draft is invalid', () => {
    expect(() =>
      buildSystemOneRequest({
        stateMode: 'text',
        stateText: '',
        model: 'jev-latest',
        questions: [question({})],
      }),
    ).toThrow(SystemOneError);
  });
});
