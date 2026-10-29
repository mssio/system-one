import { emptyDraft, type Draft, type DraftQuestion, type StateMode } from '../domain/questions';
import type { SystemOneResponse } from '../api/types';

const STORAGE_KEY = 'jev.store.v1';

export type Turn = {
  id: string;
  createdAt: string;
  model: string;
  stateMode: StateMode;
  stateText: string;
  questions: DraftQuestion[];
  result:
    | { status: 'ok'; response: SystemOneResponse }
    | { status: 'error'; statusCode?: number; message: string };
};

export type Conversation = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  turns: Turn[];
  draft: Draft;
};

export type Store = {
  conversations: Conversation[];
  newDraft: Draft;
};

export function loadStore(storage: Pick<Storage, 'getItem'>): Store {
  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) return emptyStore();
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isStore(parsed)) return emptyStore();
    return parsed;
  } catch {
    return emptyStore();
  }
}

export function saveStore(storage: Pick<Storage, 'setItem'>, store: Store): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function emptyStore(): Store {
  return { conversations: [], newDraft: emptyDraft() };
}

export function conversationTitle(stateText: string): string {
  const line = stateText
    .split(/\r?\n/)
    .map((part) => part.trim())
    .find((part) => part.length > 0);
  if (!line) return 'Untitled';
  if (line.length <= 60) return line;
  return `${line.slice(0, 60)}…`;
}

export function createConversation(draft: Draft, turn: Turn): Conversation {
  return {
    id: crypto.randomUUID(),
    title: conversationTitle(turn.stateText),
    createdAt: turn.createdAt,
    updatedAt: turn.createdAt,
    turns: [turn],
    draft,
  };
}

function isStore(value: unknown): value is Store {
  if (typeof value !== 'object' || value === null) return false;
  if (!('conversations' in value) || !Array.isArray(value.conversations)) return false;
  if (!('newDraft' in value) || typeof value.newDraft !== 'object' || value.newDraft === null) {
    return false;
  }
  return true;
}
