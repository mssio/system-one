import { useMemo, useState } from 'react';
import { dedupeQuestionIds, type DraftQuestion, type QuestionType } from '../../domain/questions';
import { parseQuestionUpload, type ParseIssue } from '../../domain/parser';
import { hasErrors, validateQuestions, type ValidationIssue } from '../../domain/validation';
import { Button } from '../catalyst/button';
import { Checkbox, CheckboxField } from '../catalyst/checkbox';
import {
  Dialog,
  DialogActions,
  DialogBody,
  DialogDescription,
  DialogTitle,
} from '../catalyst/dialog';
import { Field, Label } from '../catalyst/fieldset';
import { Select } from '../catalyst/select';
import { Textarea } from '../catalyst/textarea';
import { QuestionCard } from './QuestionCard';

const MAX_FILE_BYTES = 1_000_000;

export function UploadDialog({
  open,
  existingIds,
  onClose,
  onApply,
}: {
  open: boolean;
  existingIds: string[];
  onClose: () => void;
  onApply: (questions: DraftQuestion[], replace: boolean) => void;
}) {
  const [type, setType] = useState<QuestionType>('choice');
  const [source, setSource] = useState('');
  const [fileError, setFileError] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<string | null>(null);
  const [questions, setQuestions] = useState<DraftQuestion[]>([]);
  const [parserIssues, setParserIssues] = useState<ParseIssue[]>([]);
  const [replace, setReplace] = useState(false);

  const token = `${type}\n${source}`;
  const fresh = snapshot === token;
  const validationIssues = useMemo(
    () => (fresh ? validateQuestions(questions) : []),
    [fresh, questions],
  );
  const parserErrors = parserIssues.some((issue) => issue.severity === 'error');
  const canApply = fresh && questions.length > 0 && !parserErrors && !hasErrors(validationIssues);

  function interpret() {
    const parsed = parseQuestionUpload(source, type);
    setQuestions(parsed.questions);
    setParserIssues(parsed.issues);
    setSnapshot(`${type}\n${source}`);
  }

  function resetAndClose() {
    onClose();
  }

  return (
    <Dialog open={open} onClose={resetAndClose} size="5xl" className="max-h-[85vh] overflow-y-auto">
      <DialogTitle>Upload questions</DialogTitle>
      <DialogDescription>
        One file defines many questions of a single type. Interpret the text before adding it.
        Nothing is sent to the model until you ask Jev.
      </DialogDescription>
      <DialogBody className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-[12rem_1fr]">
          <Field>
            <Label>Question type</Label>
            <Select
              value={type}
              aria-label="Question type"
              onChange={(event) => {
                setType(event.target.value as QuestionType);
              }}
            >
              <option value="choice">Choice</option>
              <option value="score">Score</option>
              <option value="noul">Noul</option>
            </Select>
          </Field>
          <Field>
            <Label>Text file</Label>
            <input
              type="file"
              accept=".txt,text/plain"
              className="block w-full text-sm text-zinc-600 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-950 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white focus-visible:outline-2 focus-visible:outline-blue-500 dark:text-zinc-300 dark:file:bg-white dark:file:text-zinc-950"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                if (file.size > MAX_FILE_BYTES) {
                  setFileError('That file is larger than 1 MB.');
                  return;
                }
                setFileError(null);
                void file.text().then((text) => {
                  setSource(text);
                });
              }}
            />
            {fileError ? (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">
                {fileError}
              </p>
            ) : null}
          </Field>
        </div>
        <Field>
          <Label>Question text</Label>
          <Textarea
            rows={8}
            value={source}
            placeholder={placeholderFor(type)}
            onChange={(event) => {
              setSource(event.target.value);
            }}
          />
        </Field>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" outline onClick={interpret}>
            Interpret
          </Button>
          {snapshot !== null && !fresh ? (
            <p className="text-sm text-amber-700 dark:text-amber-300">
              The source changed. Interpret again before adding.
            </p>
          ) : null}
        </div>

        {fresh ? (
          <div className="space-y-4">
            <IssueList
              title="From the file"
              parserIssues={parserIssues}
              validationIssues={validationIssues}
            />
            {questions.length === 0 ? (
              <p className="text-sm text-zinc-500">No questions were produced.</p>
            ) : (
              questions.map((question, index) => (
                <QuestionCard
                  key={question.key}
                  question={question}
                  index={index}
                  total={questions.length}
                  issues={validationIssues.filter((issue) => issue.questionKey === question.key)}
                  showIssues
                  onChange={(next) => {
                    setQuestions((current) =>
                      current.map((item) => (item.key === next.key ? next : item)),
                    );
                  }}
                  onRemove={() => {
                    setQuestions((current) => current.filter((item) => item.key !== question.key));
                  }}
                  onMove={(direction) => {
                    setQuestions((current) => moveQuestion(current, index, direction));
                  }}
                />
              ))
            )}
            <CheckboxField>
              <Checkbox
                checked={replace}
                onChange={(checked) => {
                  setReplace(checked);
                }}
                color="indigo"
              />
              <Label>Replace questions already in the composer</Label>
            </CheckboxField>
          </div>
        ) : null}
      </DialogBody>
      <DialogActions>
        <Button plain onClick={resetAndClose}>
          Cancel
        </Button>
        <Button
          color="indigo"
          disabled={!canApply}
          onClick={() => {
            const taken = replace ? [] : existingIds;
            onApply(dedupeQuestionIds(questions, taken), replace);
            resetAndClose();
          }}
        >
          Add questions
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function IssueList({
  title,
  parserIssues,
  validationIssues,
}: {
  title: string;
  parserIssues: ParseIssue[];
  validationIssues: ValidationIssue[];
}) {
  if (parserIssues.length === 0 && validationIssues.length === 0) {
    return (
      <p className="text-sm text-emerald-700 dark:text-emerald-300">
        No issues. Review the cards, then add them.
      </p>
    );
  }
  return (
    <div>
      <h3 className="text-sm font-semibold text-zinc-950 dark:text-white">{title}</h3>
      <ul className="mt-2 space-y-1">
        {parserIssues.map((issue) => (
          <li
            key={`p-${issue.line}-${issue.message}`}
            className={
              issue.severity === 'error'
                ? 'text-sm text-red-600 dark:text-red-400'
                : 'text-sm text-amber-700 dark:text-amber-300'
            }
          >
            Line {issue.line}: {issue.message}
          </li>
        ))}
        {validationIssues.map((issue, index) => (
          <li
            key={`v-${issue.questionKey ?? 'q'}-${issue.line ?? index}-${issue.message}`}
            className={
              issue.severity === 'error'
                ? 'text-sm text-red-600 dark:text-red-400'
                : 'text-sm text-amber-700 dark:text-amber-300'
            }
          >
            {issue.line !== undefined ? `Line ${issue.line}: ` : ''}
            {issue.message}
          </li>
        ))}
      </ul>
    </div>
  );
}

function moveQuestion(
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

function placeholderFor(type: QuestionType): string {
  if (type === 'noul') {
    return '1. Is 1+1 = 2?\n2. is 2+2 = 4?';
  }
  return '1. what is 1+1?\na. 2\nb. 3\n\n2. what is 2+2?\na. 3\nb. 4';
}
