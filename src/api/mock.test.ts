import { describe, expect, it } from 'vitest';
import type { SystemOneRequest } from './types';
import { SystemOneError } from './errors';
import { createMockClient } from './mock';

const choiceRequest: SystemOneRequest = {
  model: 'jev-latest',
  state: 'I was charged twice.',
  questions: {
    tone: {
      type: 'choice',
      instructions: 'What is the tone?',
      criteria: { angry: 'Upset', calm: 'Polite', excited: null },
    },
  },
};

describe('createMockClient', () => {
  const client = createMockClient({ delayMs: 0, random: () => 0.5 });

  it('returns a choice distribution that sums to 1 and peaks on choice', async () => {
    const response = await client.evaluate(choiceRequest);
    const answer = response.answers.tone;
    expect(answer.type).toBe('choice');
    if (answer.type !== 'choice') return;
    const values = Object.values(answer.probabilities);
    expect(values.reduce((sum, value) => sum + value, 0)).toBeCloseTo(1, 9);
    expect(Object.keys(answer.probabilities).sort()).toEqual(['angry', 'calm', 'excited']);
    const winner = Object.entries(answer.probabilities).sort((a, b) => b[1] - a[1])[0]?.[0];
    expect(answer.choice).toBe(winner);
    expect(answer.confidence).toBeGreaterThanOrEqual(0);
    expect(answer.confidence).toBeLessThanOrEqual(1);
    expect(response.usage.input_tokens).toBeGreaterThan(0);
  });

  it('is deterministic', async () => {
    const first = await client.evaluate(choiceRequest);
    const second = await client.evaluate(choiceRequest);
    expect(second).toEqual(first);
  });

  it('returns an expected score and a legend', async () => {
    const response = await client.evaluate({
      model: 'jev-latest',
      state: 'The export button crashes Safari.',
      questions: {
        severity: {
          type: 'score',
          instructions: 'How severe?',
          criteria: ['Cosmetic', 'Workaround exists', 'Blocking'],
        },
      },
    });
    const answer = response.answers.severity;
    expect(answer.type).toBe('score');
    if (answer.type !== 'score') return;
    const keys = ['0', '1', '2'];
    expect(Object.keys(answer.legend)).toEqual(keys);
    expect(Object.keys(answer.probabilities)).toEqual(keys);
    const probs = keys.map((key) => answer.probabilities[key] ?? 0);
    expect(probs.reduce((sum, value) => sum + value, 0)).toBeCloseTo(1, 9);
    const expected = probs.reduce((sum, value, index) => sum + value * index, 0);
    expect(answer.score).toBeCloseTo(expected, 2);
  });

  it('returns a noul between 0 and 1 without confidence', async () => {
    const response = await client.evaluate({
      model: 'jev-latest',
      state: 'Please refund the extra charge.',
      questions: { billing: { type: 'noul', instructions: 'Is this about billing?' } },
    });
    const answer = response.answers.billing;
    expect(answer.type).toBe('noul');
    if (answer.type !== 'noul') return;
    expect(answer.noul).toBeGreaterThanOrEqual(0);
    expect(answer.noul).toBeLessThanOrEqual(1);
    expect('confidence' in answer).toBe(false);
  });

  it('rejects simulate-error with status 422', async () => {
    await expect(
      client.evaluate({ ...choiceRequest, state: 'hello [simulate-error]' }),
    ).rejects.toMatchObject({ name: 'SystemOneError', status: 422 });
  });

  it('rejects with 529 when random is below the threshold', async () => {
    const flaky = createMockClient({ delayMs: 0, random: () => 0 });
    await expect(flaky.evaluate(choiceRequest)).rejects.toBeInstanceOf(SystemOneError);
    await expect(flaky.evaluate(choiceRequest)).rejects.toMatchObject({ status: 529 });
  });

  it('rejects when the signal is already aborted', async () => {
    const slow = createMockClient({ delayMs: 50, random: () => 0.5 });
    const controller = new AbortController();
    controller.abort();
    await expect(slow.evaluate(choiceRequest, { signal: controller.signal })).rejects.toMatchObject(
      {
        name: 'AbortError',
      },
    );
  });
});
