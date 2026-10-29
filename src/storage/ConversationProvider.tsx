import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { emptyDraft, type Draft } from '../domain/questions';
import {
  conversationTitle,
  loadStore,
  saveStore,
  type Conversation,
  type Store,
  type Turn,
} from './conversations';

type ConversationApi = {
  store: Store;
  setNewDraft: (draft: Draft) => void;
  setConversationDraft: (id: string, draft: Draft) => void;
  commitTurn: (conversationId: string | null, turn: Turn, nextDraft: Draft) => string;
  deleteConversation: (id: string) => void;
};

const ConversationContext = createContext<ConversationApi | null>(null);

export function ConversationProvider({ children }: { children: ReactNode }) {
  const [store, setStore] = useState<Store>(() => loadStore(localStorage));

  useEffect(() => {
    saveStore(localStorage, store);
  }, [store]);

  const api = useMemo<ConversationApi>(
    () => ({
      store,
      setNewDraft: (draft) => {
        setStore((current) => ({ ...current, newDraft: draft }));
      },
      setConversationDraft: (id, draft) => {
        setStore((current) => ({
          ...current,
          conversations: current.conversations.map((conversation) =>
            conversation.id === id ? { ...conversation, draft } : conversation,
          ),
        }));
      },
      commitTurn: (conversationId, turn, nextDraft) => {
        const id = conversationId ?? crypto.randomUUID();
        setStore((current) => {
          if (!conversationId) {
            const created: Conversation = {
              id,
              title: conversationTitle(turn.stateText),
              createdAt: turn.createdAt,
              updatedAt: turn.createdAt,
              turns: [turn],
              draft: nextDraft,
            };
            return {
              newDraft: emptyDraft(),
              conversations: [created, ...current.conversations],
            };
          }
          return {
            ...current,
            conversations: current.conversations.map((conversation) =>
              conversation.id === conversationId
                ? {
                    ...conversation,
                    updatedAt: turn.createdAt,
                    turns: [...conversation.turns, turn],
                    draft: nextDraft,
                  }
                : conversation,
            ),
          };
        });
        return id;
      },
      deleteConversation: (id) => {
        setStore((current) => ({
          ...current,
          conversations: current.conversations.filter((conversation) => conversation.id !== id),
        }));
      },
    }),
    [store],
  );

  return <ConversationContext.Provider value={api}>{children}</ConversationContext.Provider>;
}

export function useConversations(): ConversationApi {
  const value = useContext(ConversationContext);
  if (!value) throw new Error('useConversations must be used within ConversationProvider');
  return value;
}
