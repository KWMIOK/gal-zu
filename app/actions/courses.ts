"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

import { deleteCourse, deleteLesson } from "@/lib/db/index";

export async function deleteCourseAction(courseId: string): Promise<void> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  await deleteCourse(courseId);
  revalidatePath("/dashboard");
}

export async function deleteLessonAction(
  courseId: string,
  lessonId: string,
): Promise<void> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  await deleteLesson(lessonId);
  revalidatePath(`/courses/${courseId}`);
  revalidatePath("/dashboard");
}
