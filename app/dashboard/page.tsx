import { auth } from "@clerk/nextjs/server";
import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { redirect } from "next/navigation";

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
import { getUserProfile, listCoursesForUser, listLessonsForCourse } from "@/lib/db/index";
import { getClerkSupabaseAccessToken } from "@/lib/supabase/clerk-token";
import { profilePreferenceSummary } from "@/lib/user-profile-normalize";

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const supabaseTokenReady = Boolean(await getClerkSupabaseAccessToken());

  const profile = supabaseTokenReady ? await getUserProfile(userId) : null;
  const activePreferenceTags = profilePreferenceSummary(profile);

  const courses = await listCoursesForUser(userId);

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
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-violet-600 dark:text-violet-400">
            Gal-zu
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/onboarding"
            className="text-sm text-zinc-600 hover:text-violet-600 dark:text-zinc-400"
          >
            Preferences
          </Link>
          <UserButton />
        </div>
      </header>

      {!supabaseTokenReady ? <SupabaseSetupBanner /> : null}

      {activePreferenceTags.length > 0 ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Active for AI generation:{" "}
          <span className="text-zinc-800 dark:text-zinc-200">
            {activePreferenceTags.join(" · ")}
          </span>
        </p>
      ) : null}

      <OmniPromptBar />

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Active courses</h2>
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
