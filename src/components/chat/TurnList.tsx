import { useState } from 'react';
import type { Answer } from '../../api/types';
import type { DraftQuestion } from '../../domain/questions';
import type { Turn } from '../../storage/conversations';
import { Badge } from '../catalyst/badge';
import { AnswerBody } from './answers';
import { typeColor, typeLabel } from './type-meta';

export function TurnList({ turns, pending }: { turns: Turn[]; pending: boolean }) {
  return (
    <div className="space-y-8" aria-live="polite">
      {turns.map((turn) => (
        <article key={turn.id} className="space-y-3">
          <StateBlock text={turn.stateText} mode={turn.stateMode} />
          {turn.questions.map((question) => (
            <QuestionResult key={question.key} question={question} turn={turn} />
          ))}
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {turn.result.status === 'ok'
              ? `${turn.result.response.model} · ${turn.result.response.usage.input_tokens} in / ${turn.result.response.usage.output_tokens} out`
              : `Model ${turn.model}`}
          </p>
        </article>
      ))}
      {pending ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400" role="status">
          Jev is judging…
        </p>
      ) : null}
      <div />
    </div>
  );
}

function StateBlock({ text, mode }: { text: string; mode: 'text' | 'json' }) {
  const lines = text.split('\n');
  const [expanded, setExpanded] = useState(false);
  const long = lines.length > 12;
  const shown = long && !expanded ? lines.slice(0, 12).join('\n') : text;

  return (
    <div className="rounded-2xl bg-white px-4 py-3 ring-1 ring-zinc-950/5 dark:bg-zinc-900 dark:ring-white/10">
      <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
        State · {mode}
      </p>
      <pre className="mt-2 font-sans text-sm whitespace-pre-wrap text-zinc-950 dark:text-zinc-100">
        {shown}
      </pre>
      {long ? (
        <button
          type="button"
          className="mt-2 text-sm font-medium text-indigo-600 focus-visible:outline-2 focus-visible:outline-blue-500 dark:text-indigo-300"
          onClick={() => {
            setExpanded((value) => !value);
          }}
        >
          {expanded ? 'Show less' : 'Show full state'}
        </button>
      ) : null}
    </div>
  );
}

function QuestionResult({ question, turn }: { question: DraftQuestion; turn: Turn }) {
  return (
    <section className="rounded-2xl bg-white px-4 py-4 ring-1 ring-zinc-950/5 dark:bg-zinc-900 dark:ring-white/10">
      <div className="flex flex-wrap items-center gap-2">
        <Badge color={typeColor(question.type)}>{typeLabel(question.type)}</Badge>
        <code className="text-xs text-zinc-500 dark:text-zinc-400">{question.id}</code>
      </div>
      <h3 className="mt-2 text-sm font-medium text-zinc-950 dark:text-white">
        {question.instructions}
      </h3>
      <div className="mt-3">
        {turn.result.status === 'error' ? (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {turn.result.statusCode ? `${turn.result.statusCode}: ` : ''}
            {turn.result.message}
          </p>
        ) : (
          <AnswerFor questionId={question.id} turn={turn} />
        )}
      </div>
    </section>
  );
}

function AnswerFor({ questionId, turn }: { questionId: string; turn: Turn }) {
  if (turn.result.status !== 'ok') return null;
  const answer = readAnswer(turn.result.response.answers, questionId);
  if (!answer) {
    return <p className="text-sm text-zinc-500">No answer was returned for this question.</p>;
  }
  return <AnswerBody answer={answer} />;
}

function readAnswer(answers: Record<string, Answer>, questionId: string): Answer | undefined {
  if (!Object.hasOwn(answers, questionId)) return undefined;
  return answers[questionId];
}
