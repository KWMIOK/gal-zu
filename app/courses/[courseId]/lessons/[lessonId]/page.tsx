import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";

import { LessonRenderer } from "@/components/lessons/lesson-renderer";
import {
  getCourseById,
  getLessonById,
} from "@/lib/db/index";

export default async function LessonPage({
  params,
}: {
  params: Promise<{ courseId: string; lessonId: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const { courseId, lessonId } = await params;
  const course = await getCourseById(courseId);
  if (!course || course.user_id !== userId) notFound();

  const lesson = await getLessonById(lessonId);
  if (!lesson || lesson.course_id !== courseId) notFound();

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
      <LessonRenderer lesson={lesson} courseId={courseId} />
    </div>
  );
}
