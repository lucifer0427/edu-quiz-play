export type SubjectId =
  | 'mandarin'
  | 'math'
  | 'english'
  | 'life'
  | 'science'
  | 'social'
  | 'arts'
  | 'health-pe'
  | 'integrative'
  | 'computer'
  | 'minnan'
  | 'hakka'
  | 'custom';

export type Grade = 1 | 2 | 3 | 4 | 5 | 6;

export type Semester = 1 | 2;

export type MapViewMode = 'curriculum' | 'classic';

export type Difficulty = 'easy' | 'medium' | 'hard';

export type MonsterId =
  | 'slime'
  | 'mathCube'
  | 'bookSpirit'
  | 'parrotKing'
  | 'treeGuardian'
  | 'flameDragon';

export interface CurriculumRef {
  academicYear: number;
  semester: Semester;
  grade: Grade;
  publisher?: string;
  bookSeries?: string | null;
  unitNo?: number;
  lessonNo?: number;
}

export interface CurriculumUnitSummary {
  unitNo: number;
  title: string;
  lessonCount: number;
  lessonTitles: string[];
}

export interface CurriculumSubjectEntry {
  academicYear: number;
  semester: Semester;
  grade: Grade;
  subjectId: Exclude<SubjectId, 'custom'>;
  subjectLabel: string;
  publisher: string;
  bookSeries: string | null;
  status: 'verified' | 'partial' | 'unverified';
  unitCount: number;
  lessonCount: number;
  units: CurriculumUnitSummary[];
}

export interface CurriculumCatalogMeta {
  generatedAt: string;
  academicYear: number;
  school: string;
  grades: Grade[];
}

export interface CurriculumGradeCatalog {
  grade: Grade;
  entries: CurriculumSubjectEntry[];
}

export type InterleavingOriginTag = 'CURRENT_UNIT' | 'PREVIOUS_UNIT_REVIEW';

export interface WorkedExampleData {
  problemStatement: string;
  steps: string[];
  commonErrorContrast: string;
  selfExplanationPrompt?: string;
  keepStepCardVisible: boolean;
}

export type VisualDiagramType =
  | 'fraction_bar'
  | 'rect_geometry'
  | 'clock_face'
  | 'number_line';

export interface VisualDiagramSpec {
  type: VisualDiagramType;
  params: Record<string, number | string>;
}

export interface Question {
  id: string;
  prompt: string;
  options: [string, string, string, string];
  answerIndex: number;
  explanation: string;
  hint?: string;
  speechText?: string;
  speechLang?: string;
  imageUrl?: string;
  audioUrl?: string;
  visualDiagram?: VisualDiagramSpec;
  tags?: string[];
  subjectId?: SubjectId;
  stageTitle?: string;
  interleavingOriginTag?: InterleavingOriginTag;
  interleavingSourceUnit?: string;
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
  generatorId?: string;
  curriculum?: CurriculumRef;
}

export interface QuizPack {
  packId: string;
  academicYear: number;
  semester: Semester;
  grade: Grade;
  subjectId: Exclude<SubjectId, 'custom'>;
  stages: Stage[];
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

export type FsrsCardStatus = 'new' | 'learning' | 'review' | 'relearning';

export interface FsrsCardState {
  questionId: string;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  learningSteps?: number;
  dueAt: string;
  lastReviewedAt?: string;
  reps: number;
  lapses: number;
  state: FsrsCardStatus;
}

export interface QuestionAttemptOutcome {
  question: Question;
  wasCorrect: boolean;
  usedHint: boolean;
  responseTimeMs: number;
  repairedInRound?: boolean;
}

export interface PlayerProgress {
  schemaVersion?: number;
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
  focusMode?: boolean;
  speechRateMode?: 'normal' | 'slow';
  fsrsCards?: Record<string, FsrsCardState>;
  completedLessonIds?: string[];
  customStages: Stage[];
  selectedView?: MapViewMode;
  selectedGrade?: Grade;
  selectedSemester?: Semester;
  selectedSubject?: SubjectId | 'all';
}

export interface LocalProfileMeta {
  id: string;
  nickname: string;
  selectedAvatarId: string;
  createdAt: string;
}

export type ActiveTab = 'map' | 'exam' | 'wrong' | 'shop' | 'teacher';
