import type { QuestionType } from '../../domain/questions';
import type { Answer } from '../../api/types';

export type QuestionBadgeColor = 'indigo' | 'amber' | 'emerald' | 'zinc';

export function typeColor(type: QuestionType | Answer['type']): QuestionBadgeColor {
  if (type === 'choice') return 'indigo';
  if (type === 'score') return 'amber';
  if (type === 'noul') return 'emerald';
  return 'zinc';
}

export function typeLabel(type: QuestionType | Answer['type']): string {
  if (type === 'choice') return 'Choice';
  if (type === 'score') return 'Score';
  if (type === 'noul') return 'Noul';
  return 'Box';
}
