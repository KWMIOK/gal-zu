import { auth } from "@clerk/nextjs/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";
import {
  DEFAULT_LEARNING_STYLES,
  DEFAULT_NEURODIVERGENT_ACCOMMODATIONS,
  type Course,
  type CourseInsert,
  type GenerationEvent,
  type Lesson,
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

async function getAuthedSupabase(): Promise<{
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  userId: string;
}> {
  const { userId } = await auth();
  if (!userId) {
    throw new DbError("Unauthorized");
  }

  const supabase = await createSupabaseServerClient();
  return { supabase, userId };
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
  const supabase = await createSupabaseServerClient();

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
  };

  const result = await supabase.from("user_profiles").insert(row).select().single();

  return throwOnError(result, "createUserProfile") as UserProfile;
}

export async function getOrCreateUserProfile(): Promise<UserProfile> {
  const { userId } = await getAuthedSupabase();
  const existing = await getUserProfile(userId);
  if (existing) {
    return existing;
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
  const supabase = await createSupabaseServerClient();

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
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("courses")
    .select("*")
    .eq("id", courseId)
    .maybeSingle();

  if (error) {
    throw new DbError(`getCourseById: ${error.message}`, error);
  }

  return data as Course | null;
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
    })
    .select()
    .single();

  return throwOnError(result, "createCourse") as Course;
}

export async function listLessonsForCourse(
  courseId: string,
): Promise<Lesson[]> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("lessons")
    .select("*")
    .eq("course_id", courseId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new DbError(`listLessonsForCourse: ${error.message}`, error);
  }

  return (data ?? []) as Lesson[];
}

export async function getLessonById(lessonId: string): Promise<Lesson | null> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("lessons")
    .select("*")
    .eq("id", lessonId)
    .maybeSingle();

  if (error) {
    throw new DbError(`getLessonById: ${error.message}`, error);
  }

  return data as Lesson | null;
}

export async function createLesson(input: LessonInsert): Promise<Lesson> {
  const { supabase, userId } = await getAuthedSupabase();

  const course = await getCourseById(input.course_id);
  if (!course || course.user_id !== userId) {
    throw new DbError("Course not found or access denied.");
  }

  const result = await supabase
    .from("lessons")
    .insert({
      course_id: input.course_id,
      title: input.title,
      format: input.format,
      content_payload: input.content_payload,
      is_completed: input.is_completed ?? false,
    })
    .select()
    .single();

  return throwOnError(result, "createLesson") as Lesson;
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
  const supabase = await createSupabaseServerClient();

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
