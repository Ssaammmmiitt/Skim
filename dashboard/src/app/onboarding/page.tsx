import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";

export const metadata = { title: "Welcome | Skim" };

export default function OnboardingPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-canvas px-4 py-12 sm:px-6 lg:py-20">
      <OnboardingWizard />
    </div>
  );
}
