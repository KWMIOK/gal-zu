import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { getUserProfile, getOrCreateUserProfile } from "@/lib/db/index";
import { normalizeUserProfileRow } from "@/lib/user-profile-normalize";

export default async function OnboardingPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  let profile = await getUserProfile(userId);
  if (!profile) {
    await getOrCreateUserProfile();
    profile = await getUserProfile(userId);
  }

  const { learning_styles, neurodivergent_accommodations } =
    normalizeUserProfileRow(profile);

  return (
    <OnboardingWizard
      mode="settings"
      initialLearningStyles={learning_styles}
      initialAccommodations={neurodivergent_accommodations}
    />
  );
}
