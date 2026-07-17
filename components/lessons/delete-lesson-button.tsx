"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";

import { deleteLessonAction } from "@/app/actions/courses";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export function DeleteLessonButton({
  courseId,
  lessonId,
  lessonTitle,
}: {
  courseId: string;
  lessonId: string;
  lessonTitle: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      await deleteLessonAction(courseId, lessonId);
      setOpen(false);
      router.push(`/courses/${courseId}`);
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 dark:border-red-900/50 dark:text-red-300 dark:hover:bg-red-950/30"
      >
        <Trash2 className="h-4 w-4" />
        Delete lesson
      </button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Delete this lesson?"
        description={`"${lessonTitle}" will be permanently removed from this course.`}
        confirmLabel="Delete lesson"
        pending={pending}
        onConfirm={handleDelete}
      />
    </>
  );
}
