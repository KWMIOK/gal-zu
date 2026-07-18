"use client";

import { useMemo } from "react";
import Lottie from "lottie-react";

import { resolveLottieAnimation } from "@/lib/animations/lottie-map";

export function LottieSlideAnimation({
  animationPrompt,
}: {
  animationPrompt?: string;
}) {
  const animationData = useMemo(
    () => resolveLottieAnimation(animationPrompt),
    [animationPrompt],
  );

  return (
    <div
      className="mx-auto h-20 w-20 shrink-0 md:h-24 md:w-24"
      aria-hidden="true"
    >
      <Lottie animationData={animationData} loop autoplay />
    </div>
  );
}
