"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, Lock } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

export type AnimatedSelectOption<T extends string> = {
  value: T;
  label: string;
  hint?: string;
  locked?: boolean;
  lockedBadge?: string;
};

type AnimatedSelectProps<T extends string> = {
  value: T | "";
  onChange: (value: T) => void;
  options: AnimatedSelectOption<T>[];
  placeholder: string;
  disabled?: boolean;
  "aria-label"?: string;
  className?: string;
};

/**
 * App-styled select: trigger matches Gal-zu inputs; the menu grows downward
 * from the control with a short height/opacity motion (not the OS popup).
 */
export function AnimatedSelect<T extends string>({
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
  "aria-label": ariaLabel,
  className = "",
}: AnimatedSelectProps<T>) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const selected = options.find((option) => option.value === value);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={`w-full ${className || "max-w-xs"}`}>
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={ariaLabel}
        onClick={() => setOpen((current) => !current)}
        className={`flex w-full items-center justify-between gap-2 rounded-xl border border-zinc-200/80 bg-white/80 px-3 py-2.5 text-left text-sm shadow-inner outline-none ring-violet-500/30 transition focus:ring-2 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-950/80 ${
          open ? "ring-2" : ""
        } ${
          selected
            ? "text-zinc-900 dark:text-zinc-50"
            : "text-zinc-400 dark:text-zinc-500"
        }`}
      >
        <span className="truncate">{selected?.label ?? placeholder}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-zinc-400 transition-transform duration-200 dark:text-zinc-500 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            key="menu"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <ul
              id={listId}
              role="listbox"
              aria-label={ariaLabel}
              className="mt-2 space-y-0.5 rounded-xl border border-zinc-200/80 bg-white/90 p-1 shadow-lg shadow-violet-500/5 backdrop-blur-xl dark:border-zinc-700 dark:bg-zinc-950/90"
            >
              {options.map((option) => {
                const isSelected = option.value === value;
                return (
                  <li key={option.value} role="presentation">
                    <button
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      disabled={disabled}
                      onClick={() => {
                        onChange(option.value);
                        setOpen(false);
                      }}
                      className={`flex w-full items-start gap-2 rounded-lg px-3 py-2 text-left text-sm transition ${
                        isSelected
                          ? "bg-violet-600 text-white"
                          : option.locked
                            ? "text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900"
                            : "text-zinc-800 hover:bg-zinc-100 dark:text-zinc-100 dark:hover:bg-zinc-900"
                      }`}
                    >
                      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
                        {option.locked ? (
                          <Lock
                            className={`h-3.5 w-3.5 ${
                              isSelected ? "text-white/90" : ""
                            }`}
                          />
                        ) : isSelected ? (
                          <Check className="h-3.5 w-3.5" />
                        ) : null}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="font-medium">{option.label}</span>
                          {option.locked ? (
                            <span
                              className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                                isSelected
                                  ? "bg-white/20 text-white"
                                  : "bg-zinc-200/80 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                              }`}
                            >
                              {option.lockedBadge ?? "Pro"}
                            </span>
                          ) : null}
                        </span>
                        {option.hint ? (
                          <span
                            className={`mt-0.5 block text-xs ${
                              isSelected
                                ? "text-violet-100"
                                : "text-zinc-500 dark:text-zinc-400"
                            }`}
                          >
                            {option.hint}
                          </span>
                        ) : null}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
