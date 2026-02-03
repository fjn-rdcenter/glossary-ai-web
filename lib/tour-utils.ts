import { AuthService } from "@/api/services/auth.service";

export const checkAndCompleteFirstLogin = async (): Promise<void> => {
  const dashboardTourCompleted = localStorage.getItem("onboardingTourCompleted");
  const documentTourCompleted = localStorage.getItem("documentSetupTourCompleted");
  const glossaryTourCompleted = localStorage.getItem("glossaryTourCompleted");
  const firstLoginCompleted = localStorage.getItem("firstLoginCompleted");

  if (dashboardTourCompleted && documentTourCompleted && glossaryTourCompleted && !firstLoginCompleted) {
    try {
      await AuthService.completeFirstLogin();
      localStorage.setItem("firstLoginCompleted", "true");
    } catch (error) {
      console.error("Error completing first login:", error);
    }
  }
}
