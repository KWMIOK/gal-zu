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

export const maxDuration = 300;

export default async function DashboardPage() {
  const actor = await getActorContext();

  const supabaseTokenReady = actor.isGuest
    ? true
    : Boolean(await getClerkSupabaseAccessToken());

  const profile =
    supabaseTokenReady ? await getUserProfile(actor.userId) : null;
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
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-6">
      {!supabaseTokenReady && !actor.isGuest ? <SupabaseSetupBanner /> : null}

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
