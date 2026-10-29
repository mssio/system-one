import { ArrowDownIcon, ArrowUpIcon, TrashIcon } from '@heroicons/react/16/solid';
import type { ReactNode } from 'react';
import {
  MAX_ENTRIES,
  createEntry,
  type DraftEntry,
  type DraftQuestion,
} from '../../domain/questions';
import type { ValidationIssue } from '../../domain/validation';
import { Badge } from '../catalyst/badge';
import { Button } from '../catalyst/button';
import { Field, Label } from '../catalyst/fieldset';
import { Input } from '../catalyst/input';
import { Textarea } from '../catalyst/textarea';
import { typeColor, typeLabel } from './type-meta';

export function QuestionCard({
  question,
  index,
  total,
  issues,
  showIssues,
  onChange,
  onRemove,
  onMove,
}: {
  question: DraftQuestion;
  index: number;
  total: number;
  issues: ValidationIssue[];
  showIssues: boolean;
  onChange: (question: DraftQuestion) => void;
  onRemove: () => void;
  onMove: (direction: -1 | 1) => void;
}) {
  const visible = issues.filter((issue) => showIssues || issue.severity === 'warning');
  const noun = question.type === 'score' ? 'level' : 'option';

  return (
    <article className="rounded-xl bg-zinc-50 p-3 ring-1 ring-zinc-950/5 dark:bg-zinc-950/40 dark:ring-white/10">
      <header className="flex flex-wrap items-center gap-2">
        <Badge color={typeColor(question.type)}>{typeLabel(question.type)}</Badge>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          {question.type === 'noul' ? 'Yes / no' : `${question.entries.length} / ${MAX_ENTRIES}`}
        </span>
        <div className="ml-auto flex items-center gap-1">
          <IconButton
            label="Move question up"
            disabled={index === 0}
            onClick={() => {
              onMove(-1);
            }}
          >
            <ArrowUpIcon className="size-4" />
          </IconButton>
          <IconButton
            label="Move question down"
            disabled={index === total - 1}
            onClick={() => {
              onMove(1);
            }}
          >
            <ArrowDownIcon className="size-4" />
          </IconButton>
          <IconButton label="Remove question" onClick={onRemove}>
            <TrashIcon className="size-4" />
          </IconButton>
        </div>
      </header>

      <div className="mt-3 grid gap-3 sm:grid-cols-[10rem_1fr]">
        <Field>
          <Label>Question id</Label>
          <Input
            value={question.id}
            aria-invalid={hasField(visible, 'id')}
            onChange={(event) => {
              onChange({ ...question, id: event.target.value });
            }}
          />
        </Field>
        <Field>
          <Label>Instructions</Label>
          <Textarea
            rows={2}
            resizable={false}
            value={question.instructions}
            aria-invalid={hasField(visible, 'instructions')}
            onChange={(event) => {
              onChange({ ...question, instructions: event.target.value });
            }}
          />
        </Field>
      </div>

      {question.type === 'noul' ? (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field>
            <Label>Yes means</Label>
            <Input
              value={question.yesMeans}
              placeholder="Optional"
              onChange={(event) => {
                onChange({ ...question, yesMeans: event.target.value });
              }}
            />
          </Field>
          <Field>
            <Label>No means</Label>
            <Input
              value={question.noMeans}
              placeholder="Optional"
              onChange={(event) => {
                onChange({ ...question, noMeans: event.target.value });
              }}
            />
          </Field>
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          {question.entries.map((entry, entryIndex) => (
            <EntryRow
              key={entry.key}
              entry={entry}
              index={entryIndex}
              total={question.entries.length}
              noun={noun}
              showDescription={question.type === 'choice'}
              invalid={visible.some((issue) => issue.entryKey === entry.key)}
              onChange={(next) => {
                onChange({
                  ...question,
                  entries: question.entries.map((item) => (item.key === entry.key ? next : item)),
                });
              }}
              onMove={(direction) => {
                onChange({
                  ...question,
                  entries: moveEntry(question.entries, entryIndex, direction),
                });
              }}
              onRemove={() => {
                onChange({
                  ...question,
                  entries: question.entries.filter((item) => item.key !== entry.key),
                });
              }}
            />
          ))}
          <Button
            type="button"
            outline
            disabled={question.entries.length >= MAX_ENTRIES}
            onClick={() => {
              onChange({ ...question, entries: [...question.entries, createEntry()] });
            }}
          >
            Add {noun}
          </Button>
        </div>
      )}

      {visible.length > 0 ? (
        <ul className="mt-3 space-y-1">
          {visible.map((issue, issueIndex) => (
            <li
              key={`${issue.field ?? 'issue'}-${issue.entryKey ?? issueIndex}`}
              className={`text-sm ${issue.severity === 'error' ? 'text-red-600 dark:text-red-400' : 'text-amber-700 dark:text-amber-300'}`}
            >
              {issue.line !== undefined ? `Line ${issue.line}: ` : ''}
              {issue.message}
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}

function EntryRow({
  entry,
  index,
  total,
  noun,
  showDescription,
  invalid,
  onChange,
  onMove,
  onRemove,
}: {
  entry: DraftEntry;
  index: number;
  total: number;
  noun: string;
  showDescription: boolean;
  invalid: boolean;
  onChange: (entry: DraftEntry) => void;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-[auto_1fr_1fr_auto] sm:items-end">
      <span className="pb-2 text-xs font-medium text-zinc-500 tabular-nums dark:text-zinc-400">
        {showDescription ? index + 1 : index}
      </span>
      <Field>
        <Label>{showDescription ? 'Option name' : 'Level'}</Label>
        <Input
          value={entry.text}
          aria-invalid={invalid}
          onChange={(event) => {
            onChange({ ...entry, text: event.target.value });
          }}
        />
      </Field>
      {showDescription ? (
        <Field>
          <Label>Description</Label>
          <Input
            value={entry.description}
            placeholder="Optional"
            onChange={(event) => {
              onChange({ ...entry, description: event.target.value });
            }}
          />
        </Field>
      ) : (
        <span className="hidden sm:block" />
      )}
      <div className="flex gap-1 pb-0.5">
        <IconButton
          label={`Move ${noun} up`}
          disabled={index === 0}
          onClick={() => {
            onMove(-1);
          }}
        >
          <ArrowUpIcon className="size-4" />
        </IconButton>
        <IconButton
          label={`Move ${noun} down`}
          disabled={index === total - 1}
          onClick={() => {
            onMove(1);
          }}
        >
          <ArrowDownIcon className="size-4" />
        </IconButton>
        <IconButton label={`Remove ${noun}`} onClick={onRemove}>
          <TrashIcon className="size-4" />
        </IconButton>
      </div>
    </div>
  );
}

function IconButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-950/5 hover:text-zinc-950 focus-visible:outline-2 focus-visible:outline-blue-500 disabled:opacity-30 dark:hover:bg-white/10 dark:hover:text-white"
    >
      {children}
    </button>
  );
}

function moveEntry(entries: DraftEntry[], index: number, direction: -1 | 1): DraftEntry[] {
  const next = index + direction;
  if (next < 0 || next >= entries.length) return entries;
  const copy = entries.slice();
  const current = copy[index];
  const swap = copy[next];
  copy[index] = swap;
  copy[next] = current;
  return copy;
}

function hasField(issues: ValidationIssue[], field: ValidationIssue['field']): boolean {
  return issues.some((issue) => issue.field === field && issue.severity === 'error');
}
