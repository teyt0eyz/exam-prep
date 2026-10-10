export type ChoiceIndex = 0 | 1 | 2 | 3;

export interface Question {
  id: string;
  topic: string;
  difficulty: 1 | 2 | 3;
  question: string;
  choices: [string, string, string, string];
  answer: ChoiceIndex;
  explanation: string;
  source: string;
}

export type QuizMode = 'practice' | 'exam';

/** Selected choice per question id, as the ORIGINAL index in `choices` (not the shuffled position). */
export type Answers = Record<string, number>;

export interface Attempt {
  id: string;
  subject: string;
  set: number;
  mode: QuizMode;
  finishedAt: string;
  durationSec: number;
  total: number;
  correct: number;
  answers: Answers;
  flagged: string[];
}

export const CHOICE_LETTERS = ['ก', 'ข', 'ค', 'ง'] as const;
