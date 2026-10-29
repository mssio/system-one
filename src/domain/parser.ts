import { createEntry, type DraftQuestion, type QuestionType } from './questions';
import type { ValidationIssue } from './validation';

export type ParseIssue = {
  line: number;
  severity: ValidationIssue['severity'];
  message: string;
};

export type ParseResult = {
  questions: DraftQuestion[];
  issues: ParseIssue[];
};

const questionPattern = /^\s*(\d+)\s*[.)]\s*(.*)$/;
const optionPattern = /^\s*([A-Za-z])\s*[.)]\s*(.*)$/;

type Acc = {
  number: number;
  line: number;
  instructionParts: string[];
  entries: DraftQuestion['entries'];
  letters: string[];
  open: 'instructions' | 'entry';
};

export function parseQuestionUpload(text: string, type: QuestionType): ParseResult {
  const cleaned = text
    .replace(/^\uFEFF/, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');
  const lines = cleaned.split('\n');
  const issues: ParseIssue[] = [];
  const questions: DraftQuestion[] = [];
  const usedIds = new Set<string>();
  const seenNumbers = new Set<number>();
  let current: Acc | null = null;

  const flush = () => {
    if (!current) return;
    const id = nextQuestionId(current.number, usedIds);
    questions.push({
      key: crypto.randomUUID(),
      id,
      type,
      instructions: current.instructionParts.join(' ').trim(),
      entries: type === 'noul' ? [] : current.entries,
      yesMeans: '',
      noMeans: '',
      sourceLine: current.line,
    });
    current = null;
  };

  for (let index = 0; index < lines.length; index += 1) {
    const lineNumber = index + 1;
    const raw = lines[index] ?? '';
    if (raw.trim() === '') continue;

    const questionMatch = questionPattern.exec(raw);
    if (questionMatch) {
      flush();
      const number = Number(questionMatch[1]);
      if (seenNumbers.has(number)) {
        issues.push({
          line: lineNumber,
          severity: 'warning',
          message: `Question number ${number} is repeated. It was imported as its own question.`,
        });
      }
      seenNumbers.add(number);
      const instruction = questionMatch[2].trim();
      current = {
        number,
        line: lineNumber,
        instructionParts: instruction.length > 0 ? [instruction] : [],
        entries: [],
        letters: [],
        open: 'instructions',
      };
      continue;
    }

    const optionMatch = optionPattern.exec(raw);
    if (optionMatch) {
      const letter = optionMatch[1].toLowerCase();
      const optionText = optionMatch[2].trim();
      if (type === 'noul') {
        issues.push({
          line: lineNumber,
          severity: 'warning',
          message:
            'Noul uploads do not use lettered options. This line was added to the question text.',
        });
        if (current && optionText.length > 0) {
          current.instructionParts.push(optionText);
          current.open = 'instructions';
        }
        continue;
      }
      if (!current) {
        issues.push({
          line: lineNumber,
          severity: 'error',
          message: 'An option appears before any question and was skipped.',
        });
        continue;
      }
      if (current.letters.includes(letter)) {
        issues.push({
          line: lineNumber,
          severity: 'warning',
          message: `Option letter "${letter}" is repeated.`,
        });
      }
      current.letters.push(letter);
      current.entries.push(createEntry(optionText, lineNumber));
      current.open = 'entry';
      continue;
    }

    const extra = raw.trim();
    if (!current) {
      issues.push({
        line: lineNumber,
        severity: 'warning',
        message: 'This line is not a numbered question and was skipped.',
      });
      continue;
    }
    if (current.open === 'entry') {
      const last = current.entries.at(-1);
      if (last) {
        last.text = `${last.text} ${extra}`.trim();
      }
    } else {
      current.instructionParts.push(extra);
    }
  }

  flush();

  if (questions.length === 0) {
    issues.unshift({
      line: 1,
      severity: 'error',
      message: 'No questions found.',
    });
  }

  return { questions, issues };
}

function nextQuestionId(number: number, used: Set<string>): string {
  const base = `q${number}`;
  if (!used.has(base)) {
    used.add(base);
    return base;
  }
  let suffix = 2;
  let id = `${base}_${suffix}`;
  while (used.has(id)) {
    suffix += 1;
    id = `${base}_${suffix}`;
  }
  used.add(id);
  return id;
}
