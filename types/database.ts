/** Learning modality preferences stored on `user_profiles.learning_styles`. */
export type LearningStyleKey =
  | "visual"
  | "auditory"
  | "hands_on"
  | "reading_writing";

export type PreferredPace = "slow" | "moderate" | "fast";

export interface LearningStyles {
  visual: boolean;
  auditory: boolean;
  hands_on: boolean;
  reading_writing: boolean;
  preferred_pace?: PreferredPace;
}

/** ADHD-focused micro-learning and focus accommodations. */
export interface AdhdAccommodations {
  enabled: boolean;
  micro_learning_mode: boolean;
  chunk_size_minutes?: number;
  reduced_distractions?: boolean;
  frequent_break_prompts?: boolean;
}

/** Visual and step-wise supports for dyscalculia. */
export interface DyscalculiaAccommodations {
  enabled: boolean;
  visual_math_aids: boolean;
  step_by_step_breakdown: boolean;
  color_coded_numbers?: boolean;
  avoid_mixed_fraction_notation?: boolean;
}

/** Low-pressure pacing and UI safeguards for math anxiety. */
export interface MathAnxietyAccommodations {
  enabled: boolean;
  gentle_progression: boolean;
  hide_timers: boolean;
  encouragement_prompts?: boolean;
  optional_hints_default?: boolean;
}

export interface NeurodivergentAccommodations {
  adhd: AdhdAccommodations;
  dyscalculia: DyscalculiaAccommodations;
  math_anxiety: MathAnxietyAccommodations;
}

export type ScopeType = "micro" | "unit" | "macro";

export type LessonFormat = "slideshow" | "cheat_sheet" | "quiz" | "script";

export interface RoadmapModule {
  id: string;
  title: string;
  description?: string;
  estimated_minutes?: number;
  order?: number;
  lesson_ids?: string[];
}

export interface RoadmapPhase {
  id: string;
  title: string;
  description?: string;
  estimated_weeks?: number;
  order?: number;
  modules: RoadmapModule[];
}

/** Multi-phase course outline generated for macro / unit scopes. */
export interface RoadmapTree {
  version: 1;
  phases: RoadmapPhase[];
  total_estimated_hours?: number;
  notes?: string;
}

export interface Slide {
  id: string;
  title: string;
  body: string;
  callout?: string;
  visual_hint?: string;
  speaker_notes?: string;
}

export interface SlideContent {
  type: "slideshow";
  slides: Slide[];
  estimated_minutes?: number;
}

export interface CheatSheetContent {
  type: "cheat_sheet";
  markdown: string;
  key_takeaways: string[];
}

export interface QuizQuestion {
  id: string;
  prompt: string;
  choices: string[];
  correct_index: number;
  hint?: string;
  explanation?: string;
}

export interface QuizContent {
  type: "quiz";
  questions: QuizQuestion[];
  passing_score_percent?: number;
}

export interface ScriptContent {
  type: "script";
  markdown: string;
}

export type LessonContentPayload =
  | SlideContent
  | CheatSheetContent
  | QuizContent
  | ScriptContent;

/** Clerk user id (`user_…`) — primary key for `user_profiles`. */
export type UserProfileId = string;

export interface UserProfile {
  id: UserProfileId;
  learning_styles: LearningStyles;
  neurodivergent_accommodations: NeurodivergentAccommodations;
  created_at: string;
  updated_at: string;
}

export interface Course {
  id: string;
  user_id: UserProfileId;
  title: string;
  description: string | null;
  scope_type: ScopeType;
  roadmap_tree: RoadmapTree | null;
  created_at: string;
  updated_at: string;
}

export interface Lesson {
  id: string;
  course_id: string;
  title: string;
  format: LessonFormat;
  content_payload: LessonContentPayload;
  is_completed: boolean;
  created_at: string;
  updated_at: string;
}

export type UserProfileInsert = {
  id: UserProfileId;
  learning_styles?: LearningStyles;
  neurodivergent_accommodations?: NeurodivergentAccommodations;
};

export type UserProfileUpdate = Partial<
  Pick<UserProfile, "learning_styles" | "neurodivergent_accommodations">
>;

export type CourseInsert = {
  user_id: UserProfileId;
  title: string;
  description?: string | null;
  scope_type: ScopeType;
  roadmap_tree?: RoadmapTree | null;
};

export type LessonInsert = {
  course_id: string;
  title: string;
  format: LessonFormat;
  content_payload: LessonContentPayload;
  is_completed?: boolean;
};

export const DEFAULT_LEARNING_STYLES: LearningStyles = {
  visual: true,
  auditory: false,
  hands_on: false,
  reading_writing: true,
  preferred_pace: "moderate",
};

export const DEFAULT_NEURODIVERGENT_ACCOMMODATIONS: NeurodivergentAccommodations =
  {
    adhd: {
      enabled: false,
      micro_learning_mode: false,
      chunk_size_minutes: 5,
      reduced_distractions: true,
    },
    dyscalculia: {
      enabled: false,
      visual_math_aids: true,
      step_by_step_breakdown: true,
      color_coded_numbers: false,
    },
    math_anxiety: {
      enabled: false,
      gentle_progression: true,
      hide_timers: true,
      encouragement_prompts: true,
    },
  };

export type Database = {
  public: {
    Tables: {
      user_profiles: {
        Row: UserProfile;
        Insert: {
          id: string;
          learning_styles?: LearningStyles;
          neurodivergent_accommodations?: NeurodivergentAccommodations;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          learning_styles?: LearningStyles;
          neurodivergent_accommodations?: NeurodivergentAccommodations;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      courses: {
        Row: Course;
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          description?: string | null;
          scope_type: ScopeType;
          roadmap_tree?: RoadmapTree | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          description?: string | null;
          scope_type?: ScopeType;
          roadmap_tree?: RoadmapTree | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "courses_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "user_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      lessons: {
        Row: Lesson;
        Insert: {
          id?: string;
          course_id: string;
          title: string;
          format: LessonFormat;
          content_payload: LessonContentPayload;
          is_completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          course_id?: string;
          title?: string;
          format?: LessonFormat;
          content_payload?: LessonContentPayload;
          is_completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "lessons_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
