import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { ChromeCookieSync } from "@/components/preferences/chrome-cookie-sync";
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

  const {
    learning_styles,
    neurodivergent_accommodations,
    preferred_language,
    font_style,
  } = normalizeUserProfileRow(profile);

  return (
    <>
      <ChromeCookieSync
        language={preferred_language}
        fontStyle={font_style}
      />
      <OnboardingWizard
        mode="settings"
        initialLearningStyles={learning_styles}
        initialAccommodations={neurodivergent_accommodations}
        initialPreferredLanguage={preferred_language}
        initialFontStyle={font_style}
      />
    </>
  );
}
