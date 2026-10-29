import { describe, expect, it } from 'vitest';
import { parseQuestionUpload } from './parser';
import { hasErrors, validateQuestions } from './validation';

const noulSample = `1. Is 1+1 = 2?
2. is 2+2 = 4?
3. is 3+3 = 6?
`;

const choiceSample = `1. what is 1+1?
a. 2
b. 3
c. 4
d. 5

2. what is 2+2?
a. 3
b. 4
c. 6
`;

describe('parseQuestionUpload', () => {
  it('parses the noul sample', () => {
    const result = parseQuestionUpload(noulSample, 'noul');
    expect(result.issues).toEqual([]);
    expect(result.questions.map((question) => question.instructions)).toEqual([
      'Is 1+1 = 2?',
      'is 2+2 = 4?',
      'is 3+3 = 6?',
    ]);
    expect(result.questions.map((question) => question.id)).toEqual(['q1', 'q2', 'q3']);
    expect(result.questions.every((question) => question.type === 'noul')).toBe(true);
    expect(result.questions.every((question) => question.entries.length === 0)).toBe(true);
  });

  it('parses the choice sample', () => {
    const result = parseQuestionUpload(choiceSample, 'choice');
    expect(result.issues).toEqual([]);
    expect(result.questions[0]?.instructions).toBe('what is 1+1?');
    expect(result.questions[0]?.entries.map((entry) => entry.text)).toEqual(['2', '3', '4', '5']);
    expect(result.questions[1]?.entries.map((entry) => entry.text)).toEqual(['3', '4', '6']);
    expect(result.questions[0]?.sourceLine).toBe(1);
    expect(result.questions[0]?.entries[0]?.sourceLine).toBe(2);
  });

  it('preserves score level order', () => {
    const result = parseQuestionUpload('1. How bad?\na. low\nb. high\n', 'score');
    expect(result.questions[0]?.entries.map((entry) => entry.text)).toEqual(['low', 'high']);
    expect(result.questions[0]?.type).toBe('score');
  });

  it('tolerates windows newlines, blank lines, whitespace, a BOM, and parenthesis markers', () => {
    const text = `\uFEFF1)  Is it true?  \r\n\r\n2)  Also true?\r\n`;
    const result = parseQuestionUpload(text, 'noul');
    expect(result.issues).toEqual([]);
    expect(result.questions.map((question) => question.instructions)).toEqual([
      'Is it true?',
      'Also true?',
    ]);

    const choice = parseQuestionUpload('1) what is 1+1?\r\na) 2\r\nb) 3\r\n', 'choice');
    expect(choice.issues).toEqual([]);
    expect(choice.questions[0]?.entries.map((entry) => entry.text)).toEqual(['2', '3']);
  });

  it('keeps a choice with no options so validation can point at the line', () => {
    const result = parseQuestionUpload('1. what is 1+1?\n\n2. what is 2+2?\na. 4\n', 'choice');
    expect(result.questions).toHaveLength(2);
    const issues = validateQuestions(result.questions);
    expect(issues).toEqual([
      expect.objectContaining({
        severity: 'error',
        line: 1,
        questionKey: result.questions[0]?.key,
      }),
    ]);
    expect(hasErrors(issues)).toBe(true);
  });

  it('keeps more than 100 options and validation cites the 101st line', () => {
    const options = Array.from({ length: 101 }, (_, index) => {
      const letter = String.fromCharCode(97 + (index % 26));
      return `${letter}. option ${index}`;
    });
    const text = ['1. pick one', ...options].join('\n');
    const result = parseQuestionUpload(text, 'choice');
    expect(result.questions[0]?.entries).toHaveLength(101);
    const line = result.questions[0]?.entries[100]?.sourceLine;
    expect(line).toBe(102);
    const issues = validateQuestions(result.questions);
    expect(issues).toEqual([expect.objectContaining({ severity: 'error', line })]);
  });

  it('joins a continuation line with a space', () => {
    const result = parseQuestionUpload('1. what is\n   one plus one?\na. two\n', 'choice');
    expect(result.questions[0]?.instructions).toBe('what is one plus one?');
  });

  it('errors when an option appears before a question', () => {
    const result = parseQuestionUpload('a. orphan\n1. real?\nb. yes\n', 'choice');
    expect(result.issues).toEqual([expect.objectContaining({ severity: 'error', line: 1 })]);
    expect(result.questions[0]?.entries.map((entry) => entry.text)).toEqual(['yes']);
  });

  it('errors on empty input', () => {
    const result = parseQuestionUpload('  \n\n', 'noul');
    expect(result.questions).toEqual([]);
    expect(result.issues).toEqual([expect.objectContaining({ severity: 'error', line: 1 })]);
  });

  it('warns on duplicate question numbers and disambiguates ids', () => {
    const result = parseQuestionUpload('1. first?\n1. second?\n', 'noul');
    expect(result.questions.map((question) => question.id)).toEqual(['q1', 'q1_2']);
    expect(result.issues).toEqual([expect.objectContaining({ severity: 'warning', line: 2 })]);
  });

  it('warns on a repeated option letter and keeps both texts', () => {
    const result = parseQuestionUpload('1. pick\na. one\nb. two\nb. three\n', 'choice');
    expect(result.questions[0]?.entries.map((entry) => entry.text)).toEqual([
      'one',
      'two',
      'three',
    ]);
    expect(result.issues).toEqual([expect.objectContaining({ severity: 'warning', line: 4 })]);
  });

  it('appends lettered noul lines to the instructions and warns', () => {
    const result = parseQuestionUpload('1. Is it true?\na. maybe\n', 'noul');
    expect(result.questions[0]?.instructions).toBe('Is it true? maybe');
    expect(result.questions[0]?.entries).toEqual([]);
    expect(result.issues).toEqual([expect.objectContaining({ severity: 'warning', line: 2 })]);
  });

  it('warns about unrecognized text before the first question', () => {
    const result = parseQuestionUpload('hello\n1. Is it true?\n', 'noul');
    expect(result.questions).toHaveLength(1);
    expect(result.issues).toEqual([expect.objectContaining({ severity: 'warning', line: 1 })]);
  });
});
