import { auth } from "@clerk/nextjs/server";

import {
  CourseGrid,
  type CourseWithProgress,
} from "@/components/dashboard/course-grid";
import { OmniPromptBar } from "@/components/dashboard/omni-prompt-bar";
import { SupabaseSetupBanner } from "@/components/dashboard/supabase-setup-banner";
import {
  computeCourseProgress,
  getActiveLessonId,
} from "@/lib/course-progress";
import {
  getActorContext,
  getUserProfile,
  listCoursesForUser,
  listLessonsForCourse,
} from "@/lib/db/index";
import { getQuotaSummary, type QuotaSummary } from "@/lib/generation/quota";
import { getClerkSupabaseAccessToken } from "@/lib/supabase/clerk-token";
import { profilePreferenceSummary } from "@/lib/user-profile-normalize";

export const maxDuration = 300;

export default async function DashboardPage() {
  const { userId: clerkUserId } = await auth();
  const actor = await getActorContext();

  const supabaseTokenReady = actor.isGuest
    ? true
    : Boolean(await getClerkSupabaseAccessToken());

  const profile =
    supabaseTokenReady ? await getUserProfile(actor.userId) : null;
  const activePreferenceTags = clerkUserId
    ? profilePreferenceSummary(profile)
    : [];
  const quota: QuotaSummary | null =
    profile && !actor.isGuest ? await getQuotaSummary(profile) : null;
  const canUsePaidDepths = profile?.plan_tier === "pro";

  const courses = supabaseTokenReady
    ? await listCoursesForUser(actor.userId)
    : [];

  const coursesWithProgress: CourseWithProgress[] = await Promise.all(
    courses.map(async (course) => {
      const lessons = await listLessonsForCourse(course.id);
      const { percent, completed, total } = computeCourseProgress(lessons);
      return {
        ...course,
        progressPercent: percent,
        completedCount: completed,
        totalLessons: total,
        activeLessonId: getActiveLessonId(lessons),
      };
    }),
  );

  const activeCourses = coursesWithProgress.filter((c) => c.progressPercent < 100);
  const completedCourses = coursesWithProgress.filter(
    (c) => c.progressPercent === 100 && c.totalLessons > 0,
  );

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-10 px-6 py-10">
      <header>
        <p className="text-sm font-medium text-violet-600 dark:text-violet-400">
          Gal-zu
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">
          {actor.isGuest ? "Start learning" : "Dashboard"}
        </h1>
        {actor.isGuest ? (
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Try Quick answer or Overview free — no account required. Sign up
            anytime to save preferences.
          </p>
        ) : null}
      </header>

      {!supabaseTokenReady && !actor.isGuest ? <SupabaseSetupBanner /> : null}

      {activePreferenceTags.length > 0 ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Active for AI generation:{" "}
          <span className="text-zinc-800 dark:text-zinc-200">
            {activePreferenceTags.join(" · ")}
          </span>
        </p>
      ) : null}

      <OmniPromptBar
        initialQuota={quota}
        canUsePaidDepths={canUsePaidDepths}
      />

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">
          {actor.isGuest ? "Your sessions" : "Active courses"}
        </h2>
        <CourseGrid courses={activeCourses} />
      </section>

      {completedCourses.length > 0 ? (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Completed</h2>
          <CourseGrid courses={completedCourses} />
        </section>
      ) : null}
    </div>
  );
}
