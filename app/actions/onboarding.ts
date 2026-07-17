"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

import {
  getOrCreateUserProfile,
  getUserProfile,
  updateUserProfile,
} from "@/lib/db/index";
import { normalizeUserProfileRow } from "@/lib/user-profile-normalize";
import type {
  LearningStyles,
  NeurodivergentAccommodations,
  UserProfile,
} from "@/types/database";

export type OnboardingFormState = {
  learning_styles: LearningStyles;
  neurodivergent_accommodations: NeurodivergentAccommodations;
};

export type SavePreferencesResult =
  | { ok: true; profile: UserProfile }
  | { ok: false; error: string };

export async function loadMyProfilePreferences(): Promise<{
  learning_styles: LearningStyles;
  neurodivergent_accommodations: NeurodivergentAccommodations;
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

  try {
    await getOrCreateUserProfile();

    const profile = await updateUserProfile(userId, {
      learning_styles: data.learning_styles,
      neurodivergent_accommodations: data.neurodivergent_accommodations,
    });

    revalidatePath("/onboarding");
    revalidatePath("/dashboard");

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
