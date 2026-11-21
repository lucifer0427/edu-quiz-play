export type SubjectId = 'math' | 'mandarin' | 'english' | 'science' | 'custom';

export type Difficulty = 'easy' | 'medium' | 'hard';

export type MonsterId =
  | 'slime'
  | 'mathCube'
  | 'bookSpirit'
  | 'parrotKing'
  | 'treeGuardian'
  | 'flameDragon';

export interface Question {
  id: string;
  prompt: string;
  options: [string, string, string, string];
  answerIndex: number;
  explanation: string;
  hint?: string;
  speechText?: string;
  speechLang?: string;
}

export interface Stage {
  id: string;
  subjectId: SubjectId;
  title: string;
  description: string;
  difficulty: Difficulty;
  monsterId: MonsterId;
  monsterName: string;
  monsterHp: number;
  questions: Question[];
  isDynamicMath?: boolean;
}

export interface HeroAvatar {
  id: string;
  name: string;
  title: string;
  description: string;
  price: number;
  accentHex: string;
  bgClass: string;
  ringClass: string;
}

export interface PlayerProgress {
  nickname: string;
  selectedAvatarId: string;
  unlockedAvatarIds: string[];
  xp: number;
  coins: number;
  stageStars: Record<string, number>;
  wrongQuestionIds: string[];
  wrongQuestionSnapshots?: Record<string, Question>;
  totalCorrect: number;
  totalAnswered: number;
  soundEnabled: boolean;
  customStages: Stage[];
}

export type ActiveTab = 'map' | 'wrong' | 'shop' | 'teacher';
