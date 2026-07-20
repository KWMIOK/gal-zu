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

/** Subscription tier — drives the daily generation cap (see `lib/generation/quota.ts`). */
export type PlanTier = "free" | "pro";

/** Mirrors RevenueCat's entitlement lifecycle for the linked subscription, if any. */
export type SubscriptionStatus =
  | "none"
  | "active"
  | "grace_period"
  | "expired"
  | "cancelled";

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

export interface MatchPairItem {
  id: string;
  left: string;
  right: string;
}

export interface MatchPairsWidget {
  type: "match_pairs";
  prompt?: string;
  data: MatchPairItem[];
}

export interface MultipleChoiceOption {
  id: string;
  text: string;
}

export interface MultipleChoiceWidgetData {
  question: string;
  options: MultipleChoiceOption[];
  correct_option_id: string;
  explanation?: string;
}

export interface MultipleChoiceWidget {
  type: "multiple_choice";
  prompt?: string;
  data: MultipleChoiceWidgetData;
}

/** Duolingo-style mini-games that halt slide progression until solved. */
export type InteractiveWidget = MatchPairsWidget | MultipleChoiceWidget;

export interface Citation {
  title: string;
  url: string;
}

export interface Slide {
  id: string;
  title: string;
  /** Primary educational text shown on the slide. */
  text_content: string;
  /**
   * @deprecated Pre-Phase-5 field name for `text_content`. Kept optional so
   * lessons generated before this migration keep rendering.
   */
  body?: string;
  callout?: string;
  visual_hint?: string;
  speaker_notes?: string;
  /** Conversational script written for Text-to-Speech playback, distinct from `text_content`. */
  spoken_narration?: string;
  /** Semantic tag (e.g. "celebration", "bouncing_math_equation") mapped to a Lottie animation. */
  animation_prompt?: string;
  /** Mini-game that halts progression until the learner completes it. */
  interactive_widget?: InteractiveWidget;
}

export interface SlideContent {
  type: "slideshow";
  slides: Slide[];
  estimated_minutes?: number;
  /** Real source URLs from Google Search grounding — never model-generated. */
  citations?: Citation[];
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
  /** Defaults to "free" for every user until a RevenueCat webhook says otherwise. */
  plan_tier: PlanTier;
  subscription_status: SubscriptionStatus;
  subscription_expires_at: string | null;
  subscription_updated_at: string | null;
  /** RevenueCat's app_user_id for this profile, once a purchase has been linked. */
  revenuecat_app_user_id: string | null;
  created_at: string;
  updated_at: string;
}

/** One row per Gemini call that actually ran — the read side of the daily generation cap. */
export interface GenerationEvent {
  id: string;
  user_id: UserProfileId;
  kind: "classification" | "lesson";
  created_at: string;
}

/**
 * 'classifying': placeholder row, `classifyAndBuildRoadmap` + lesson 1 not
 * generated yet — `roadmap_tree` is null, `title` is a temporary echo of the
 * learner's raw topic. 'ready': classification succeeded, real title/
 * roadmap in place. 'failed': classification was attempted and threw —
 * `generation_error` has the real detail, retry via `ensureCourseClassified`.
 */
export type CourseGenerationStatus = "classifying" | "ready" | "failed";

export interface Course {
  id: string;
  user_id: UserProfileId;
  title: string;
  description: string | null;
  scope_type: ScopeType;
  roadmap_tree: RoadmapTree | null;
  status: CourseGenerationStatus;
  /** The real error from the last failed classification attempt — never a generic message. See lib/gemini.ts. */
  generation_error: string | null;
  /** The cleaned learner prompt fed to classification — persisted so a retry doesn't need it re-supplied. */
  topic: string | null;
  /** Raw `PromptDepth` / `PromptSessionLength` values (see lib/generation/create-course.ts) — stored as plain strings here to avoid a circular type import. */
  depth: string | null;
  session_length: string | null;
  /** Set once, at creation — lets a stuck 'classifying' row become retryable after a timeout instead of stuck forever. */
  classification_started_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Everything needed to actually generate a lesson's content later, without
 * re-deriving it from the course/roadmap — stashed on `pending` lesson rows
 * at course-creation time (see lib/generation/lesson-planning.ts) so lazy
 * generation (lib/generation/lazy.ts) can call `generateLessonPayload`
 * exactly as if it were running eagerly.
 */
export type LessonGenerationPlan = {
  topic: string;
  context: string;
  slideMin: number;
  slideMax: number;
};

/**
 * 'pending': placeholder row, not generated yet — `content_payload` is null.
 * 'generating': claimed by an in-flight generation call (prevents double-spend on races).
 * 'ready': `content_payload` has real (or fallback) content.
 * 'failed': generation was attempted and blocked (e.g. quota) — retry on next open.
 */
export type LessonGenerationStatus = "pending" | "generating" | "ready" | "failed";

export interface Lesson {
  id: string;
  course_id: string;
  title: string;
  format: LessonFormat;
  content_payload: LessonContentPayload | null;
  is_completed: boolean;
  generation_status: LessonGenerationStatus;
  generation_plan: LessonGenerationPlan | null;
  /** The real error from the last failed generation attempt — never a generic message. See lib/gemini.ts. */
  generation_error: string | null;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export type UserProfileInsert = {
  id: UserProfileId;
  learning_styles?: LearningStyles;
  neurodivergent_accommodations?: NeurodivergentAccommodations;
};

export type UserProfileUpdate = Partial<
  Pick<
    UserProfile,
    | "learning_styles"
    | "neurodivergent_accommodations"
    | "plan_tier"
    | "subscription_status"
    | "subscription_expires_at"
    | "subscription_updated_at"
    | "revenuecat_app_user_id"
  >
>;

export type GenerationEventInsert = {
  user_id: UserProfileId;
  kind: "classification" | "lesson";
};

export type CourseInsert = {
  user_id: UserProfileId;
  title: string;
  description?: string | null;
  scope_type: ScopeType;
  roadmap_tree?: RoadmapTree | null;
  status?: CourseGenerationStatus;
  topic?: string | null;
  depth?: string | null;
  session_length?: string | null;
  classification_started_at?: string | null;
};

export type CourseUpdate = Partial<
  Pick<
    Course,
    | "title"
    | "description"
    | "scope_type"
    | "roadmap_tree"
    | "status"
    | "generation_error"
    | "classification_started_at"
  >
>;

export type LessonInsert = {
  course_id: string;
  title: string;
  format: LessonFormat;
  order_index: number;
  /** Omit (or pass null) for a 'pending' placeholder — pair with `generation_plan`. */
  content_payload?: LessonContentPayload | null;
  generation_status?: LessonGenerationStatus;
  generation_plan?: LessonGenerationPlan | null;
  generation_error?: string | null;
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
          plan_tier?: PlanTier;
          subscription_status?: SubscriptionStatus;
          subscription_expires_at?: string | null;
          subscription_updated_at?: string | null;
          revenuecat_app_user_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          learning_styles?: LearningStyles;
          neurodivergent_accommodations?: NeurodivergentAccommodations;
          plan_tier?: PlanTier;
          subscription_status?: SubscriptionStatus;
          subscription_expires_at?: string | null;
          subscription_updated_at?: string | null;
          revenuecat_app_user_id?: string | null;
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
          status?: CourseGenerationStatus;
          generation_error?: string | null;
          topic?: string | null;
          depth?: string | null;
          session_length?: string | null;
          classification_started_at?: string | null;
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
          status?: CourseGenerationStatus;
          generation_error?: string | null;
          topic?: string | null;
          depth?: string | null;
          session_length?: string | null;
          classification_started_at?: string | null;
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
          order_index?: number;
          content_payload?: LessonContentPayload | null;
          generation_status?: LessonGenerationStatus;
          generation_plan?: LessonGenerationPlan | null;
          generation_error?: string | null;
          is_completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          course_id?: string;
          title?: string;
          format?: LessonFormat;
          order_index?: number;
          content_payload?: LessonContentPayload | null;
          generation_status?: LessonGenerationStatus;
          generation_plan?: LessonGenerationPlan | null;
          generation_error?: string | null;
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
      generation_events: {
        Row: GenerationEvent;
        Insert: {
          id?: string;
          user_id: string;
          kind: "classification" | "lesson";
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          kind?: "classification" | "lesson";
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "generation_events_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "user_profiles";
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
