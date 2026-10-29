export type StateValue = string | Record<string, unknown> | unknown[];

export type NoulCriteria = {
  true?: string | null;
  false?: string | null;
};

export type NoulQuestion = {
  type: 'noul';
  instructions?: string | null;
  criteria?: NoulCriteria | null;
};

export type ChoiceQuestion = {
  type: 'choice';
  instructions?: string | null;
  criteria: Record<string, string | null>;
};

export type ScoreQuestion = {
  type: 'score';
  instructions?: string | null;
  criteria: string[];
};

export type Question = NoulQuestion | ChoiceQuestion | ScoreQuestion;

export type SystemOneRequest = {
  model: string;
  state: StateValue;
  questions: Record<string, Question>;
};

export type Usage = {
  input_tokens: number;
  output_tokens: number;
};

export type NoulAnswer = {
  type: 'noul';
  noul: number;
};

export type ChoiceAnswer = {
  type: 'choice';
  choice: string;
  confidence: number;
  probabilities: Record<string, number>;
};

export type ScoreAnswer = {
  type: 'score';
  score: number;
  confidence: number;
  legend: Record<string, string>;
  probabilities: Record<string, number>;
};

export type BoxAnswer = {
  type: 'box';
  box: { top: number; bottom: number; left: number; right: number };
  confidence: number | null;
};

export type Answer = NoulAnswer | ChoiceAnswer | ScoreAnswer | BoxAnswer;

export type SystemOneResponse = {
  model: string;
  answers: Record<string, Answer>;
  usage: Usage;
};
