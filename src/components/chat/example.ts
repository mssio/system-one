import type { Draft } from '../../domain/questions';

export const exampleDraft: Draft = {
  stateMode: 'text',
  stateText: 'I was charged twice for my subscription this month. Please refund the extra charge.',
  model: 'jev-latest',
  questions: [
    {
      key: 'example-billing',
      id: 'billing',
      type: 'noul',
      instructions: 'Is this message about billing?',
      entries: [],
      yesMeans: 'The customer is asking about a charge, invoice, refund, or payment.',
      noMeans: 'The message is not about billing.',
    },
    {
      key: 'example-tone',
      id: 'tone',
      type: 'choice',
      instructions: 'What is the tone of this message?',
      entries: [
        { key: 'tone-angry', text: 'angry', description: 'An upset or hostile message' },
        { key: 'tone-calm', text: 'calm', description: 'A neutral or polite message' },
        { key: 'tone-excited', text: 'excited', description: 'An enthusiastic or eager message' },
      ],
      yesMeans: '',
      noMeans: '',
    },
    {
      key: 'example-urgency',
      id: 'urgency',
      type: 'score',
      instructions: 'How urgent is this message?',
      entries: [
        { key: 'urgency-0', text: 'Can wait', description: '' },
        { key: 'urgency-1', text: 'Needs attention this week', description: '' },
        { key: 'urgency-2', text: 'Needs attention today', description: '' },
      ],
      yesMeans: '',
      noMeans: '',
    },
  ],
};

export function isMockMode(): boolean {
  return (import.meta.env.VITE_API_MODE ?? 'mock').trim().toLowerCase() !== 'http';
}
