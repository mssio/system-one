import { useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router';
import { buildSystemOneRequest } from '../../api/build-request';
import { createClientFromEnv } from '../../api/client';
import { SystemOneError } from '../../api/errors';
import { useAuth } from '../../auth/AuthProvider';
import { emptyDraft, type Draft, type DraftQuestion } from '../../domain/questions';
import { useConversations } from '../../storage/ConversationProvider';
import type { Turn } from '../../storage/conversations';
import { Composer } from './Composer';
import { EmptyState } from './EmptyState';
import { exampleDraft } from './example';
import { TurnList } from './TurnList';

export function ChatView() {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const auth = useAuth();
  const { store, setNewDraft, setConversationDraft, commitTurn } = useConversations();
  const client = useMemo(() => createClientFromEnv(), []);
  const abortRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [pending, setPending] = useState(false);

  const conversation = store.conversations.find((item) => item.id === conversationId);
  const draft = conversation ? conversation.draft : store.newDraft;
  const turns = conversation?.turns ?? [];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [turns.length, pending]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  if (conversationId && !conversation) {
    return <Navigate to="/" replace />;
  }

  function changeDraft(next: Draft) {
    if (conversation) setConversationDraft(conversation.id, next);
    else setNewDraft(next);
  }

  async function submit() {
    if (pending) return;
    const request = buildSystemOneRequest(draft);
    const controller = new AbortController();
    abortRef.current = controller;
    setPending(true);
    try {
      const accessToken = await auth.getAccessToken();
      const response = await client.evaluate(request, { accessToken, signal: controller.signal });
      const turn = makeTurn(draft, { status: 'ok', response });
      const id = commitTurn(conversation?.id ?? null, turn, emptyDraft());
      void navigate(`/c/${id}`);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      const described = describeError(error);
      const turn = makeTurn(draft, {
        status: 'error',
        message: described.message,
        ...(described.statusCode === undefined ? {} : { statusCode: described.statusCode }),
      });
      const id = commitTurn(conversation?.id ?? null, turn, draft);
      void navigate(`/c/${id}`);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl px-4 py-6">
          {turns.length === 0 && draft.questions.length === 0 && draft.stateText.trim() === '' ? (
            <EmptyState
              onExample={() => {
                changeDraft(structuredClone(exampleDraft));
              }}
            />
          ) : (
            <TurnList turns={turns} pending={pending} />
          )}
          <div ref={bottomRef} />
        </div>
      </div>
      <div className="border-t border-zinc-950/5 bg-zinc-100/90 px-4 py-3 backdrop-blur dark:border-white/10 dark:bg-zinc-950/80">
        <div className="mx-auto w-full max-w-3xl">
          <Composer
            key={conversation?.id ?? 'new'}
            draft={draft}
            pending={pending}
            onChange={changeDraft}
            onSubmit={() => {
              void submit();
            }}
          />
        </div>
      </div>
    </div>
  );
}

function makeTurn(draft: Draft, result: Turn['result']): Turn {
  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    model: draft.model.trim(),
    stateMode: draft.stateMode,
    stateText: draft.stateText,
    questions: snapshotQuestions(draft.questions),
    result,
  };
}

function snapshotQuestions(questions: DraftQuestion[]): DraftQuestion[] {
  return questions.map((question) => ({
    ...question,
    entries: question.entries.map((entry) => ({ ...entry })),
  }));
}

function describeError(error: unknown): { message: string; statusCode?: number } {
  if (error instanceof SystemOneError) {
    return {
      message: error.message,
      ...(error.status > 0 ? { statusCode: error.status } : {}),
    };
  }
  if (error instanceof Error) return { message: error.message };
  return { message: 'Something went wrong.' };
}
