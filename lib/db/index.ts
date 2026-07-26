import { auth } from "@clerk/nextjs/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import { ensureGuestId } from "@/lib/guest/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";
import { normalizeUserProfileRow } from "@/lib/user-profile-normalize";
import {
  DEFAULT_FONT_STYLE,
  DEFAULT_LEARNING_ADAPTATION,
  DEFAULT_LEARNING_STYLES,
  DEFAULT_NEURODIVERGENT_ACCOMMODATIONS,
  DEFAULT_PREFERRED_LANGUAGE,
  type Course,
  type CourseInsert,
  type CourseUpdate,
  type GenerationEvent,
  type Lesson,
  type LessonContentPayload,
  type LessonGenerationStatus,
  type LessonInsert,
  type PlanTier,
  type SubscriptionStatus,
  type UserProfile,
  type UserProfileInsert,
  type UserProfileUpdate,
} from "@/types/database";

export class DbError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "DbError";
  }
}

export type ActorContext = {
  supabase: SupabaseClient;
  userId: string;
  /** True when acting via guest cookie + service role (no Clerk session). */
  isGuest: boolean;
};

/**
 * Resolves the acting learner: Clerk user (RLS JWT) or anonymous guest
 * (cookie id + service-role client). Guest writes bypass RLS intentionally;
 * every mutator still checks `course.user_id === userId`.
 */
async function getAuthedSupabase(): Promise<ActorContext> {
  const { userId } = await auth();
  if (userId) {
    const supabase = await createSupabaseServerClient();
    return { supabase, userId, isGuest: false };
  }

  const guestId = await ensureGuestId();
  return {
    supabase: createSupabaseServiceRoleClient(),
    userId: guestId,
    isGuest: true,
  };
}

/** Same as getAuthedSupabase — exported for pages that need guest vs signed-in. */
export async function getActorContext(): Promise<ActorContext> {
  return getAuthedSupabase();
}

function throwOnError<T>(
  result: { data: T; error: { message: string } | null },
  context: string,
): T {
  if (result.error) {
    throw new DbError(`${context}: ${result.error.message}`, result.error);
  }
  return result.data;
}

export async function getUserProfile(
  userId: string,
): Promise<UserProfile | null> {
  // Prefer actor client so guests (service role) can read their own row.
  const { supabase, userId: actorId } = await getAuthedSupabase();
  if (actorId !== userId) {
    throw new DbError("Cannot read another user's profile.");
  }

  const { data, error } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new DbError(`getUserProfile: ${error.message}`, error);
  }

  return data as UserProfile | null;
}

export async function createUserProfile(
  input: UserProfileInsert,
): Promise<UserProfile> {
  const { supabase, userId } = await getAuthedSupabase();

  if (input.id !== userId) {
    throw new DbError("Cannot create profile for another user.");
  }

  const row = {
    id: input.id,
    learning_styles: input.learning_styles ?? DEFAULT_LEARNING_STYLES,
    neurodivergent_accommodations:
      input.neurodivergent_accommodations ??
      DEFAULT_NEURODIVERGENT_ACCOMMODATIONS,
    learning_adaptation:
      input.learning_adaptation ?? DEFAULT_LEARNING_ADAPTATION,
    preferred_language:
      input.preferred_language ?? DEFAULT_PREFERRED_LANGUAGE,
    font_style: input.font_style ?? DEFAULT_FONT_STYLE,
  };

  const result = await supabase.from("user_profiles").insert(row).select().single();

  return throwOnError(result, "createUserProfile") as UserProfile;
}

export async function getOrCreateUserProfile(): Promise<UserProfile> {
  const { userId } = await getAuthedSupabase();
  const existing = await getUserProfile(userId);
  if (existing) {
    const normalized = normalizeUserProfileRow(existing);
    return {
      ...existing,
      learning_styles: normalized.learning_styles,
      neurodivergent_accommodations: normalized.neurodivergent_accommodations,
      learning_adaptation: normalized.learning_adaptation,
      preferred_language: normalized.preferred_language,
      font_style: normalized.font_style,
    };
  }
  return createUserProfile({ id: userId });
}

export async function updateUserProfile(
  userId: string,
  patch: UserProfileUpdate,
): Promise<UserProfile> {
  const { supabase, userId: authUserId } = await getAuthedSupabase();

  if (authUserId !== userId) {
    throw new DbError("Cannot update another user's profile.");
  }

  const result = await supabase
    .from("user_profiles")
    .update(patch)
    .eq("id", userId)
    .select()
    .single();

  return throwOnError(result, "updateUserProfile") as UserProfile;
}

export async function listCoursesForUser(userId: string): Promise<Course[]> {
  const { supabase, userId: actorId } = await getAuthedSupabase();
  if (actorId !== userId) {
    throw new DbError("Cannot list another user's courses.");
  }

  const { data, error } = await supabase
    .from("courses")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new DbError(`listCoursesForUser: ${error.message}`, error);
  }

  return (data ?? []) as Course[];
}

export async function getCourseById(courseId: string): Promise<Course | null> {
  const { supabase, userId } = await getAuthedSupabase();

  const { data, error } = await supabase
    .from("courses")
    .select("*")
    .eq("id", courseId)
    .maybeSingle();

  if (error) {
    throw new DbError(`getCourseById: ${error.message}`, error);
  }

  if (!data) return null;
  // Service-role guest path can see any row — enforce ownership in app code.
  if ((data as Course).user_id !== userId) return null;

  return data as Course;
}

export async function createCourse(input: CourseInsert): Promise<Course> {
  const { supabase, userId } = await getAuthedSupabase();

  if (input.user_id !== userId) {
    throw new DbError("Cannot create courses for another user.");
  }

  await getOrCreateUserProfile();

  const result = await supabase
    .from("courses")
    .insert({
      user_id: input.user_id,
      title: input.title,
      description: input.description ?? null,
      scope_type: input.scope_type,
      roadmap_tree: input.roadmap_tree ?? null,
      status: input.status ?? "ready",
      topic: input.topic ?? null,
      depth: input.depth ?? null,
      session_length: input.session_length ?? null,
      classification_started_at: input.classification_started_at ?? null,
    })
    .select()
    .single();

  return throwOnError(result, "createCourse") as Course;
}

/** Generic course-row patch — used to land classification results or record a failure. */
export async function updateCourse(
  courseId: string,
  patch: CourseUpdate,
): Promise<Course> {
  const { supabase, userId } = await getAuthedSupabase();

  const course = await getCourseById(courseId);
  if (!course || course.user_id !== userId) {
    throw new DbError("Course not found or access denied.");
  }

  const result = await supabase
    .from("courses")
    .update(patch)
    .eq("id", courseId)
    .select()
    .single();

  return throwOnError(result, "updateCourse") as Course;
}

/**
 * Atomically claims a course for (re-)classification — mirrors
 * `tryClaimLessonForGeneration`. `classification_started_at` is left null
 * at creation (see `createCourseFromPrompt`) and only set the moment a
 * request actually starts working the row, so this can tell "never
 * attempted yet" apart from "another request/tab is already on it".
 * Succeeds only if the row is `failed`, `classifying` and never claimed
 * (`classification_started_at IS NULL`), or `classifying` and stale (older
 * than `staleAfterMs` — whatever claimed it likely died/timed out without
 * reporting back). Returns `null` if someone else holds a fresh claim.
 */
export async function tryClaimCourseForClassification(
  courseId: string,
  staleAfterMs = 3 * 60 * 1000,
): Promise<Course | null> {
  const { supabase, userId } = await getAuthedSupabase();

  const course = await getCourseById(courseId);
  if (!course) {
    throw new DbError("Course not found.");
  }
  if (course.user_id !== userId) {
    throw new DbError("Access denied.");
  }

  const staleBefore = new Date(Date.now() - staleAfterMs).toISOString();
  const nowIso = new Date().toISOString();

  const { data, error } = await supabase
    .from("courses")
    .update({
      status: "classifying",
      classification_started_at: nowIso,
      generation_error: null,
    })
    .eq("id", courseId)
    .or(
      `status.eq.failed,and(status.eq.classifying,classification_started_at.is.null),and(status.eq.classifying,classification_started_at.lt.${staleBefore})`,
    )
    .select()
    .maybeSingle();

  if (error) {
    throw new DbError(`tryClaimCourseForClassification: ${error.message}`, error);
  }

  return (data as Course | null) ?? null;
}

export async function listLessonsForCourse(
  courseId: string,
): Promise<Lesson[]> {
  const { supabase, userId } = await getAuthedSupabase();
  const course = await getCourseById(courseId);
  if (!course || course.user_id !== userId) {
    throw new DbError("Course not found or access denied.");
  }

  const { data, error } = await supabase
    .from("lessons")
    .select("*")
    .eq("course_id", courseId)
    .order("order_index", { ascending: true });

  if (error) {
    throw new DbError(`listLessonsForCourse: ${error.message}`, error);
  }

  return (data ?? []) as Lesson[];
}

/**
 * Dashboard progress in one query (avoids N× listLessonsForCourse round-trips).
 * Only fetches the columns needed for progress + active lesson.
 */
export async function listLessonProgressForCourses(
  courseIds: string[],
): Promise<
  Map<
    string,
    Array<Pick<Lesson, "id" | "course_id" | "is_completed" | "order_index">>
  >
> {
  const map = new Map<
    string,
    Array<Pick<Lesson, "id" | "course_id" | "is_completed" | "order_index">>
  >();
  if (courseIds.length === 0) return map;

  const { supabase } = await getAuthedSupabase();
  const { data, error } = await supabase
    .from("lessons")
    .select("id, course_id, is_completed, order_index")
    .in("course_id", courseIds)
    .order("order_index", { ascending: true });

  if (error) {
    throw new DbError(`listLessonProgressForCourses: ${error.message}`, error);
  }

  for (const row of data ?? []) {
    const lesson = row as Pick<
      Lesson,
      "id" | "course_id" | "is_completed" | "order_index"
    >;
    const list = map.get(lesson.course_id) ?? [];
    list.push(lesson);
    map.set(lesson.course_id, list);
  }

  return map;
}

export async function getLessonById(lessonId: string): Promise<Lesson | null> {
  const { supabase, userId } = await getAuthedSupabase();

  const { data, error } = await supabase
    .from("lessons")
    .select("*")
    .eq("id", lessonId)
    .maybeSingle();

  if (error) {
    throw new DbError(`getLessonById: ${error.message}`, error);
  }

  if (!data) return null;

  const course = await getCourseById((data as Lesson).course_id);
  if (!course || course.user_id !== userId) return null;

  return data as Lesson;
}

export async function createLesson(input: LessonInsert): Promise<Lesson> {
  const { supabase, userId } = await getAuthedSupabase();

  const course = await getCourseById(input.course_id);
  if (!course || course.user_id !== userId) {
    throw new DbError("Course not found or access denied.");
  }

  const contentPayload = input.content_payload ?? null;

  const result = await supabase
    .from("lessons")
    .insert({
      course_id: input.course_id,
      title: input.title,
      format: input.format,
      order_index: input.order_index,
      content_payload: contentPayload,
      generation_status:
        input.generation_status ?? (contentPayload ? "ready" : "pending"),
      generation_plan: input.generation_plan ?? null,
      is_completed: input.is_completed ?? false,
    })
    .select()
    .single();

  return throwOnError(result, "createLesson") as Lesson;
}

/**
 * Atomically flips a `pending` or `failed` lesson to `generating` — the
 * guard against a background prefetch (see `prefetchNextPendingLesson`) and
 * a learner opening that same lesson racing each other into two Gemini
 * calls for the same row. Returns `null` if someone else already claimed
 * it (or it's already `ready`/being generated), in which case the caller
 * should just re-read the row instead of generating anything.
 */
export async function tryClaimLessonForGeneration(
  lessonId: string,
): Promise<Lesson | null> {
  const { supabase, userId } = await getAuthedSupabase();

  const lesson = await getLessonById(lessonId);
  if (!lesson) {
    throw new DbError("Lesson not found.");
  }
  const course = await getCourseById(lesson.course_id);
  if (!course || course.user_id !== userId) {
    throw new DbError("Access denied.");
  }

  const { data, error } = await supabase
    .from("lessons")
    .update({ generation_status: "generating" })
    .eq("id", lessonId)
    .in("generation_status", ["pending", "failed"])
    .select()
    .maybeSingle();

  if (error) {
    throw new DbError(`tryClaimLessonForGeneration: ${error.message}`, error);
  }

  return (data as Lesson | null) ?? null;
}

/** Persists the outcome of a lazy/background generation attempt for one lesson. */
export async function saveGeneratedLessonContent(
  lessonId: string,
  contentPayload: LessonContentPayload | null,
  status: LessonGenerationStatus,
  generationError: string | null = null,
): Promise<Lesson> {
  const { supabase, userId } = await getAuthedSupabase();

  const lesson = await getLessonById(lessonId);
  if (!lesson) {
    throw new DbError("Lesson not found.");
  }
  const course = await getCourseById(lesson.course_id);
  if (!course || course.user_id !== userId) {
    throw new DbError("Access denied.");
  }

  const result = await supabase
    .from("lessons")
    .update({
      content_payload: contentPayload,
      generation_status: status,
      generation_error: generationError,
    })
    .eq("id", lessonId)
    .select()
    .single();

  return throwOnError(result, "saveGeneratedLessonContent") as Lesson;
}

export async function markLessonCompleted(
  lessonId: string,
  isCompleted = true,
): Promise<Lesson> {
  const { supabase, userId } = await getAuthedSupabase();

  const lesson = await getLessonById(lessonId);
  if (!lesson) {
    throw new DbError("Lesson not found.");
  }

  const course = await getCourseById(lesson.course_id);
  if (!course || course.user_id !== userId) {
    throw new DbError("Access denied.");
  }

  const result = await supabase
    .from("lessons")
    .update({ is_completed: isCompleted })
    .eq("id", lessonId)
    .select()
    .single();

  return throwOnError(result, "markLessonCompleted") as Lesson;
}

export async function deleteCourse(courseId: string): Promise<void> {
  const { supabase, userId } = await getAuthedSupabase();

  const course = await getCourseById(courseId);
  if (!course || course.user_id !== userId) {
    throw new DbError("Course not found or access denied.");
  }

  const { error } = await supabase.from("courses").delete().eq("id", courseId);

  if (error) {
    throw new DbError(`deleteCourse: ${error.message}`, error);
  }
}

export async function deleteLesson(lessonId: string): Promise<void> {
  const { supabase, userId } = await getAuthedSupabase();

  const lesson = await getLessonById(lessonId);
  if (!lesson) {
    throw new DbError("Lesson not found.");
  }

  const course = await getCourseById(lesson.course_id);
  if (!course || course.user_id !== userId) {
    throw new DbError("Access denied.");
  }

  const { error } = await supabase.from("lessons").delete().eq("id", lessonId);

  if (error) {
    throw new DbError(`deleteLesson: ${error.message}`, error);
  }
}

/**
 * Logs one completed Gemini call against the daily generation cap (see
 * `lib/generation/quota.ts`). Deliberately swallow-free of retries here —
 * callers should treat a logging failure as non-fatal (the lesson/course
 * was already generated successfully) and just report it, never roll back
 * or block on it.
 */
export async function recordGenerationEvent(
  kind: GenerationEvent["kind"],
): Promise<void> {
  const { supabase, userId } = await getAuthedSupabase();

  const { error } = await supabase
    .from("generation_events")
    .insert({ user_id: userId, kind });

  if (error) {
    throw new DbError(`recordGenerationEvent: ${error.message}`, error);
  }
}

/** Count of generation events for `userId` at or after `sinceIso` — the daily-cap read side. */
export async function countGenerationEventsSince(
  userId: string,
  sinceIso: string,
): Promise<number> {
  const { supabase, userId: actorId } = await getAuthedSupabase();
  if (actorId !== userId) {
    throw new DbError("Cannot read another user's generation events.");
  }

  const { count, error } = await supabase
    .from("generation_events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", sinceIso);

  if (error) {
    throw new DbError(`countGenerationEventsSince: ${error.message}`, error);
  }

  return count ?? 0;
}

/**
 * Writes subscription entitlement fields onto a user's profile using the
 * Supabase **service role** client — the only DB helper in this file that
 * bypasses RLS, because it's meant to be called from the RevenueCat webhook
 * route, which has no Clerk session to authenticate as the affected user.
 * Never expose this to anything reachable from a user-authenticated request.
 */
export async function upsertSubscriptionEntitlement(
  userId: string,
  patch: {
    plan_tier: PlanTier;
    subscription_status: SubscriptionStatus;
    subscription_expires_at: string | null;
    revenuecat_app_user_id?: string | null;
  },
): Promise<void> {
  const supabase = createSupabaseServiceRoleClient();

  const { error } = await supabase
    .from("user_profiles")
    .update({
      plan_tier: patch.plan_tier,
      subscription_status: patch.subscription_status,
      subscription_expires_at: patch.subscription_expires_at,
      subscription_updated_at: new Date().toISOString(),
      ...(patch.revenuecat_app_user_id !== undefined
        ? { revenuecat_app_user_id: patch.revenuecat_app_user_id }
        : {}),
    })
    .eq("id", userId);

  if (error) {
    throw new DbError(`upsertSubscriptionEntitlement: ${error.message}`, error);
  }
}

/** A single retrieved chunk from a trusted, pre-vetted knowledge source. */
export type RagContextChunk = {
  source: string;
  text: string;
  url?: string;
};

export type RagContextResult = {
  chunks: RagContextChunk[];
  /** True once a real retrieval backend is wired up; always false for the stub. */
  isLive: boolean;
};

/**
 * Architecture stub for Phase 6 (LlamaIndex RAG).
 *
 * Once implemented, this will query a vector index built from vetted
 * textbooks/documentation (via LlamaIndex, likely backed by a `pgvector`
 * table in this same Supabase project) and return the top-matching chunks
 * for `topic`, so `generateLessonPayload` in `lib/gemini.ts` can inject
 * verified source material into the prompt instead of relying solely on
 * the model's parametric memory or live Google Search grounding.
 *
 * Intentionally returns an empty result today — call sites must treat an
 * empty `chunks` array as "no trusted context available" and fall back to
 * their existing generation path, never as an error.
 */
export async function fetchTrustedRagContext(
  topic: string,
): Promise<RagContextResult> {
  void topic;
  return { chunks: [], isLive: false };
}
