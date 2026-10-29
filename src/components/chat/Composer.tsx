import { useState } from 'react';
import {
  createQuestion,
  MAX_ENTRIES,
  type Draft,
  type DraftQuestion,
  type QuestionType,
} from '../../domain/questions';
import { hasErrors, validateDraft, type ValidationIssue } from '../../domain/validation';
import { Button } from '../catalyst/button';
import { Field, Label } from '../catalyst/fieldset';
import { Input } from '../catalyst/input';
import { Textarea } from '../catalyst/textarea';
import { isMockMode } from './example';
import { QuestionCard } from './QuestionCard';
import { UploadDialog } from './UploadDialog';

export function Composer({
  draft,
  pending,
  onChange,
  onSubmit,
}: {
  draft: Draft;
  pending: boolean;
  onChange: (draft: Draft) => void;
  onSubmit: () => void;
}) {
  const [showIssues, setShowIssues] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const issues = validateDraft(draft);
  const blocked = hasErrors(issues);

  function updateQuestion(next: DraftQuestion) {
    onChange({
      ...draft,
      questions: draft.questions.map((question) => (question.key === next.key ? next : question)),
    });
  }

  return (
    <form
      className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-zinc-950/10 dark:bg-zinc-900 dark:ring-white/10"
      onSubmit={(event) => {
        event.preventDefault();
        setShowIssues(true);
        if (blocked || pending) return;
        onSubmit();
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
          event.preventDefault();
          setShowIssues(true);
          if (!blocked && !pending) onSubmit();
        }
      }}
    >
      <div className="grid gap-3 sm:grid-cols-[1fr_12rem]">
        <Field>
          <div className="flex items-center justify-between gap-2">
            <Label>State</Label>
            <div
              role="group"
              aria-label="State format"
              className="flex rounded-lg bg-zinc-950/5 p-0.5 dark:bg-white/10"
            >
              {(['text', 'json'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  aria-pressed={draft.stateMode === mode}
                  className={`rounded-md px-2 py-1 text-xs font-medium focus-visible:outline-2 focus-visible:outline-blue-500 ${
                    draft.stateMode === mode
                      ? 'bg-white text-zinc-950 shadow-sm dark:bg-zinc-700 dark:text-white'
                      : 'text-zinc-500 dark:text-zinc-400'
                  }`}
                  onClick={() => {
                    onChange({ ...draft, stateMode: mode });
                  }}
                >
                  {mode === 'text' ? 'Text' : 'JSON'}
                </button>
              ))}
            </div>
          </div>
          <Textarea
            rows={5}
            value={draft.stateText}
            aria-invalid={showIssues && issues.some((issue) => issue.field === 'state')}
            placeholder={
              draft.stateMode === 'json'
                ? '{ "message": "I was charged twice." }'
                : 'Paste the content Jev should judge.'
            }
            onChange={(event) => {
              onChange({ ...draft, stateText: event.target.value });
            }}
          />
        </Field>
        <Field>
          <Label>Model</Label>
          <Input
            value={draft.model}
            aria-invalid={showIssues && issues.some((issue) => issue.field === 'model')}
            onChange={(event) => {
              onChange({ ...draft, model: event.target.value });
            }}
          />
          <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
            Alias <code>jev-latest</code> is the usual choice.
          </p>
        </Field>
      </div>

      <div className="mt-4 space-y-3">
        {draft.questions.map((question, index) => (
          <QuestionCard
            key={question.key}
            question={question}
            index={index}
            total={draft.questions.length}
            issues={issues.filter((issue) => issue.questionKey === question.key)}
            showIssues={showIssues}
            onChange={updateQuestion}
            onRemove={() => {
              onChange({
                ...draft,
                questions: draft.questions.filter((item) => item.key !== question.key),
              });
            }}
            onMove={(direction) => {
              onChange({ ...draft, questions: moveQuestions(draft.questions, index, direction) });
            }}
          />
        ))}
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <AddButton
            label="Choice"
            onClick={() => {
              add(draft, onChange, 'choice');
            }}
          />
          <AddButton
            label="Score"
            onClick={() => {
              add(draft, onChange, 'score');
            }}
          />
          <AddButton
            label="Noul"
            onClick={() => {
              add(draft, onChange, 'noul');
            }}
          />
          <Button
            type="button"
            outline
            onClick={() => {
              setUploadOpen(true);
            }}
          >
            Upload text
          </Button>
        </div>
        <div className="flex flex-col items-stretch gap-2 sm:items-end">
          {showIssues && blocked ? <IssueSummary issues={issues} /> : null}
          <Button type="submit" color="indigo" disabled={pending || (showIssues && blocked)}>
            {pending ? 'Asking…' : 'Ask Jev'}
          </Button>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {MAX_ENTRIES} options or levels max. Ctrl or Cmd + Enter to ask.
            {isMockMode() ? ' Include [simulate-error] in the state to preview a failure.' : ''}
          </p>
        </div>
      </div>

      <UploadDialog
        open={uploadOpen}
        existingIds={draft.questions.map((question) => question.id)}
        onClose={() => {
          setUploadOpen(false);
        }}
        onApply={(questions, replace) => {
          onChange({
            ...draft,
            questions: replace ? questions : [...draft.questions, ...questions],
          });
          setShowIssues(true);
        }}
      />
    </form>
  );
}

function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button type="button" outline onClick={onClick}>
      Add {label}
    </Button>
  );
}

function add(draft: Draft, onChange: (draft: Draft) => void, type: QuestionType) {
  const question = createQuestion(
    type,
    draft.questions.map((item) => item.id),
  );
  onChange({ ...draft, questions: [...draft.questions, question] });
}

function moveQuestions(
  questions: DraftQuestion[],
  index: number,
  direction: -1 | 1,
): DraftQuestion[] {
  const next = index + direction;
  if (next < 0 || next >= questions.length) return questions;
  const copy = questions.slice();
  const current = copy[index];
  const swap = copy[next];
  copy[index] = swap;
  copy[next] = current;
  return copy;
}

function IssueSummary({ issues }: { issues: ValidationIssue[] }) {
  const errors = issues.filter((issue) => issue.severity === 'error');
  return (
    <p className="text-sm text-red-600 dark:text-red-400" role="alert">
      {errors.length === 1 ? errors[0]?.message : `${errors.length} issues to fix before asking.`}
    </p>
  );
}
