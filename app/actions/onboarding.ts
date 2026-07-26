"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

import {
  getOrCreateUserProfile,
  getUserProfile,
  updateUserProfile,
} from "@/lib/db/index";
import {
  isFontStyle,
  isPreferredLanguage,
} from "@/lib/preferences/language-font";
import { normalizeUserProfileRow } from "@/lib/user-profile-normalize";
import type {
  FontStyle,
  LearningStyles,
  NeurodivergentAccommodations,
  PreferredLanguage,
  UserProfile,
} from "@/types/database";

export type OnboardingFormState = {
  learning_styles: LearningStyles;
  neurodivergent_accommodations: NeurodivergentAccommodations;
  preferred_language: PreferredLanguage;
  font_style: FontStyle;
};

export type SavePreferencesResult =
  | { ok: true; profile: UserProfile }
  | { ok: false; error: string };

export async function loadMyProfilePreferences(): Promise<{
  learning_styles: LearningStyles;
  neurodivergent_accommodations: NeurodivergentAccommodations;
  preferred_language: PreferredLanguage;
  font_style: FontStyle;
}> {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }

  const profile = await getUserProfile(userId);
  if (!profile) {
    await getOrCreateUserProfile();
    const created = await getUserProfile(userId);
    return normalizeUserProfileRow(created);
  }

  return normalizeUserProfileRow(profile);
}

export async function saveOnboardingPreferences(
  data: OnboardingFormState,
): Promise<SavePreferencesResult> {
  const { userId } = await auth();
  if (!userId) {
    return { ok: false, error: "You must be signed in to save preferences." };
  }

  if (!isPreferredLanguage(data.preferred_language)) {
    return { ok: false, error: "Invalid preferred language." };
  }
  if (!isFontStyle(data.font_style)) {
    return { ok: false, error: "Invalid font style." };
  }

  try {
    await getOrCreateUserProfile();

    const profile = await updateUserProfile(userId, {
      learning_styles: data.learning_styles,
      neurodivergent_accommodations: data.neurodivergent_accommodations,
      preferred_language: data.preferred_language,
      font_style: data.font_style,
    });

    revalidatePath("/onboarding");
    revalidatePath("/dashboard");
    revalidatePath("/", "layout");

    return { ok: true, profile };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Could not save preferences. Check Supabase + Clerk JWT setup.";
    console.error("[saveOnboardingPreferences]", error);
    return { ok: false, error: message };
  }
}
