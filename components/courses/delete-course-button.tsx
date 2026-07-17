"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";

import { deleteCourseAction } from "@/app/actions/courses";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export function DeleteCourseButton({
  courseId,
  courseTitle,
  variant = "default",
  afterDelete,
}: {
  courseId: string;
  courseTitle: string;
  variant?: "default" | "icon";
  /** Called after successful delete (e.g. refresh only when already on dashboard). */
  afterDelete?: "refresh" | "dashboard";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      await deleteCourseAction(courseId);
      setOpen(false);
      if (afterDelete !== "refresh") {
        router.push("/dashboard");
      }
      router.refresh();
    });
  }

  const triggerClass =
    variant === "icon"
      ? "inline-flex shrink-0 rounded-lg p-2 text-zinc-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
      : "inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-800 hover:bg-red-100 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={triggerClass}
        aria-label={`Delete course ${courseTitle}`}
        title="Delete course"
      >
        <Trash2 className={variant === "icon" ? "h-4 w-4" : "h-4 w-4"} />
        {variant === "default" ? "Delete course" : null}
      </button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Delete this course?"
        description={`"${courseTitle}" and all of its lessons will be permanently removed. This cannot be undone.`}
        confirmLabel="Delete course"
        pending={pending}
        onConfirm={handleDelete}
      />
    </>
  );
}
