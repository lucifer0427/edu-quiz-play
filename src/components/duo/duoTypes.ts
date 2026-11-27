import type { Grade, SubjectId } from '../../types/quiz';

export type DuoMode = 'coop' | 'versus' | 'speed';

export type DuoSubject =
  | Extract<SubjectId, 'math' | 'mandarin' | 'english' | 'science' | 'social'>
  | 'mixed';

export const DUO_GRADES: Grade[] = [1, 2, 3, 4, 5, 6];

export const DUO_SUBJECT_OPTIONS: Array<{ id: DuoSubject; label: string }> = [
  { id: 'math', label: '數學' },
  { id: 'mandarin', label: '國語' },
  { id: 'english', label: '英語' },
  { id: 'science', label: '生活／自然' },
  { id: 'social', label: '社會' },
  { id: 'mixed', label: '全科綜合' },
];

export const SPEED_ROUND_SECONDS = 12;
export const SPEED_TARGET_SCORE = 10;
export const SPEED_MAX_QUESTIONS = 10;
export const TARGET_VERSUS_SCORE = 5;

export interface PlayerState {
  index: number;
  score: number;
  combo: number;
  feedback: 'correct' | 'wrong' | null;
}

export interface SpeedRoundState {
  questionIndex: number;
  timeLeft: number;
  lockedA: boolean;
  lockedB: boolean;
  winnerThisRound: 'A' | 'B' | 'none' | null;
  pickedOptIdx: number | null;
  lastMessage: string | null;
}
