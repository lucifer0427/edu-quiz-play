import type {
  Grade,
  Semester,
  SubjectId,
  WorkedExampleData,
} from './quiz.ts';

export type AgeBand = 'AGE_6_8_LOWER' | 'AGE_9_12_UPPER';

export type LessonSubject = 'LANGUAGE' | 'MATH' | 'SCIENCE_SOCIAL';

export type SceneComponentType =
  | 'ANCHOR_SCENE'
  | 'WORKED_EXAMPLE_SPLIT'
  | 'TOPIC_SIGNAL_BOX'
  | 'WARMUP_CHECK'
  | 'SPATIAL_3D_SCENE';

export type LessonDiagramTemplateId =
  | 'fraction_bar'
  | 'rect_geometry'
  | 'number_line'
  | 'flow_cause'
  | 'concept_compare'
  | 'clock_face';

export interface SpatialLabel {
  id: string;
  text: string;
  anchorPointId: string;
}

export interface InteractiveParamSpec {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  unit?: string;
}

export interface LessonVisualSpec {
  templateId: LessonDiagramTemplateId;
  params?: Record<string, number | string | string[]>;
  interactiveParam?: InteractiveParamSpec;
  spatialLabels: SpatialLabel[];
}

export interface WarmupCheckData {
  prompt: string;
  options: string[];
  answerIndex: number;
  feedbackCorrect: string;
  feedbackRetry: string;
}

export interface Spatial3DSpec {
  modelType:
    | 'CUBOID_BLOCKS'
    | 'NET_UNFOLD'
    | 'CYLINDER_UNFOLD'
    | 'EARTH_MOON_SUN';
  params: Record<string, number | string>;
  allowedControls: Array<'UNFOLD_SLIDER' | 'LAYER_SLICE' | 'ORBIT_RESET'>;
}

export interface LessonScene {
  sceneId: string;
  componentType: SceneComponentType;
  title: string;
  narrationText: string;
  cognitiveChunks: string[];
  analogyAnchor?: string;
  visualSpec?: LessonVisualSpec;
  workedExampleData?: WorkedExampleData;
  topicSignalTitle?: string;
  warmupCheck?: WarmupCheckData;
  spatial3dSpec?: Spatial3DSpec;
  factGroundingSourceId: string;
}

export interface LessonScript {
  schemaVersion: '2026.1';
  lessonId: string;
  stageId: string;
  title: string;
  ageBand: AgeBand;
  subject: LessonSubject;
  scenes: LessonScene[];
}

export interface LessonPack {
  packId: string;
  schemaVersion: '2026.1';
  academicYear: number;
  semester: Semester;
  grade: Grade;
  subjectId: Exclude<SubjectId, 'custom'>;
  lessons: LessonScript[];
}
