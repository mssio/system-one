import { describe, expect, it } from 'vitest';
import { emptyDraft } from '../domain/questions';
import {
  conversationTitle,
  createConversation,
  loadStore,
  saveStore,
  type Turn,
} from './conversations';

function memory() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
  };
}

describe('conversation store', () => {
  it('returns an empty store when nothing is saved', () => {
    const store = loadStore(memory());
    expect(store.conversations).toEqual([]);
    expect(store.newDraft).toEqual(emptyDraft());
  });

  it('round-trips a conversation', () => {
    const storage = memory();
    const turn: Turn = {
      id: 't1',
      createdAt: '2026-10-29T00:00:00.000Z',
      model: 'jev-latest',
      stateMode: 'text',
      stateText: 'Hello there',
      questions: [],
      result: {
        status: 'ok',
        response: {
          model: 'jev-latest',
          answers: { billing: { type: 'noul', noul: 0.9 } },
          usage: { input_tokens: 10, output_tokens: 2 },
        },
      },
    };
    const conversation = createConversation({ ...emptyDraft(), stateText: 'Hello there' }, turn);
    saveStore(storage, { conversations: [conversation], newDraft: emptyDraft() });
    const loaded = loadStore(storage);
    expect(loaded.conversations[0]?.title).toBe(conversation.title);
    expect(loaded.conversations[0]?.turns).toEqual([turn]);
  });

  it('returns an empty store for invalid json', () => {
    const storage = memory();
    storage.setItem('jev.store.v1', '{');
    expect(loadStore(storage).conversations).toEqual([]);
  });
});

describe('conversationTitle', () => {
  it('uses the first non-empty line and caps the length', () => {
    expect(conversationTitle('  \nRefund please\nmore')).toBe('Refund please');
    expect(conversationTitle('   ')).toBe('Untitled');
    const long = 'a'.repeat(80);
    expect(conversationTitle(long)).toBe(`${'a'.repeat(60)}…`);
  });
});
