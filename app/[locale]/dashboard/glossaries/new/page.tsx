"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { PageTransition, SlideUp } from "@/components/ui/page-transition";
import { GlossaryForm } from "@/components/glossary/glossary-form";
import { GlossaryResponse } from "@/lib/types";
import { useTranslations } from 'next-intl';
import { AuthService } from "@/api/services";
import Joyride, { CallBackProps, STATUS, Step, TooltipRenderProps } from "react-joyride";
import { motion } from "framer-motion";

export default function NewGlossaryPage() {
  const router = useRouter();
  const trmlOnboarding = useTranslations("Onboarding");
  const trmlGlossary = useTranslations("Glossaries")
  const trml = useTranslations("GlossaryCreateTour");

  const [runTour, setRunTour] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleSuccess = (createdGlossary: GlossaryResponse) => {
    router.push(`/dashboard/glossaries/${createdGlossary.id}`);
  };

  const CustomTooltip = ({
    index,
    step,
    backProps,
    primaryProps,
    skipProps,
    tooltipProps,
    size,
    isLastStep
  }: TooltipRenderProps) => {
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          e.stopPropagation();
          primaryProps.onClick(e as any);
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }, [primaryProps]);

    return (
      <div
        {...tooltipProps}
        className="bg-background text-foreground rounded-xl shadow-2xl p-0 max-w-[400px] border border-border overflow-hidden flex flex-col"
      >
        <div className="p-5 flex flex-col gap-3">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex justify-between">
            <span>Bước {index + 1} / {size}</span>
          </div>
          <div className="text-sm">
            {step.content}
          </div>
        </div>
        <div className="p-4 bg-muted/30 border-t border-border flex justify-between items-center">
          <button
            {...skipProps}
            className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors px-2 py-1"
          >
            {trmlOnboarding("skipTour")}
          </button>
          <div className="flex gap-2">
            {index > 0 && (
              <Button {...backProps} variant="outline" size="sm" className="h-8 text-xs">
                {trmlOnboarding("back")}
              </Button>
            )}
            <Button {...primaryProps} size="sm" className="h-8 text-xs bg-primary text-primary-foreground">
              {isLastStep ? trmlOnboarding("finish") : trmlOnboarding("next")}
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const tourSteps: Step[] = [
    {
      target: 'body',
      placement: 'center',
      content: (
        <div className="text-center py-2 px-1">
          <h3 className="text-lg font-bold mb-2">{trml("welcomeTitle")}</h3>
          <p className="text-muted-foreground leading-relaxed text-left">
            {trml("welcomeDescription")}
          </p>
        </div>
      ),
      disableBeacon: true,
    },
    {
      target: '#glossary-name-field',
      content: (
        <div>
          <h3 className="font-bold text-base mb-1">{trml("nameTitle")}</h3>
          <p className="text-muted-foreground leading-relaxed">
            {trml.rich("nameDescription", {
              b: (chunks: any) => <b>{chunks}</b>
            })}
          </p>
        </div>
      ),
      placement: 'bottom',
      disableBeacon: true,
    },
    {
      target: '#glossary-languages',
      content: (
        <div>
          <h3 className="font-bold text-base mb-1">{trml("langTitle")}</h3>
          <p className="text-muted-foreground leading-relaxed">
            {trml.rich("langDescription", {
              b: (chunks: any) => <b>{chunks}</b>
            })}
          </p>
        </div>
      ),
      placement: 'bottom',
    },
    {
      target: '#glossary-description-field',
      content: (
        <div>
          <h3 className="font-bold text-base mb-1">{trml("descTitle")}</h3>
          <p className="text-muted-foreground leading-relaxed">
            {trml("descDescription")}
          </p>
        </div>
      ),
      placement: 'bottom',
    },
    {
      target: '#glossary-tabs',
      content: (
        <div>
          <h3 className="font-bold text-base mb-1">{trml("tabsTitle")}</h3>
          <p className="text-muted-foreground leading-relaxed">
            {trml.rich("tabsDescription", {
              b: (chunks: any) => <b>{chunks}</b>,
              br: () => <br />
            })}
          </p>
        </div>
      ),
      placement: 'top',
    },
    {
      target: '#glossary-term-table',
      content: (
        <div>
          <h3 className="font-bold text-base mb-1">{trml("tableTitle")}</h3>
          <p className="text-muted-foreground leading-relaxed">
            {trml.rich("tableDescription", {
              b: (chunks: any) => <b>{chunks}</b>,
              br: () => <br />
            })}
          </p>
        </div>
      ),
      placement: 'top',
    },
    {
      target: '#add-term-btn',
      content: (
        <div>
          <h3 className="font-bold text-base mb-1">{trml("addTermTitle")}</h3>
          <p className="text-muted-foreground leading-relaxed">
            {trml("addTermDescription")}
          </p>
        </div>
      ),
      placement: 'top',
    },
    {
      target: '#glossary-summary',
      content: (
        <div>
          <h3 className="font-bold text-base mb-1">{trml("saveTitle")}</h3>
          <p className="text-muted-foreground leading-relaxed">
            {trml.rich("saveDescription", {
              b: (chunks: any) => <b>{chunks}</b>
            })}
          </p>
        </div>
      ),
      placement: 'left',
    },
  ];

  const handleJoyrideCallback = async (data: CallBackProps) => {
    const { status } = data;
    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status as any)) {
      setRunTour(false);

      // Remove focus from any element to prevent accidental restarts via Enter
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }

      // Try to sync with backend
      try {
        await AuthService.updateUserProfile({
          walkthrough_status: { glossary_tour: true }
        });
        // Remove localStorage after successful backend sync
        localStorage.removeItem("createGlossaryTourCompleted");
      } catch (error) {
        // Fallback to localStorage if API fails
        console.warn("Failed to sync create glossary tour completion to backend:", error);
        localStorage.setItem("createGlossaryTourCompleted", "true");
      }
    }
  };

  return (
    <PageTransition className="container mx-auto px-6 py-10">
      {/* Header */}
      <SlideUp>
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard/glossaries")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-serif font-semibold text-foreground">{trmlGlossary("createGlossary")}</h1>
            <p className="mt-1 text-muted-foreground">
              {trmlGlossary("createGlossaryDescription")}
            </p>
          </div>
        </div>
      </SlideUp>

      <GlossaryForm
        mode="create"
        onSuccess={handleSuccess}
        onCancel={() => router.push("/dashboard/glossaries")}
      />

      {/* Tour Component */}
      {isMounted && (
        <Joyride
          key={runTour ? 'tour-active' : 'tour-idle'}
          steps={tourSteps}
          run={runTour}
          continuous={true}
          scrollToFirstStep={false}
          scrollOffset={120}
          scrollDuration={300}
          disableScrollParentFix={true}
          showProgress={true}
          showSkipButton={true}
          hideCloseButton
          disableOverlayClose
          tooltipComponent={CustomTooltip}
          callback={handleJoyrideCallback}
          floaterProps={{
            disableAnimation: true,
            hideArrow: false,
          }}
          styles={{
            options: {
              backgroundColor: '#ffffff',
              textColor: '#334155',
              overlayColor: "rgba(0, 0, 0, 0.65)",
              zIndex: 10000,
              primaryColor: "#3b82f6",
              width: 400,
            },
            spotlight: {
              borderRadius: '12px',
            },
            tooltip: {
              borderRadius: '16px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              padding: 0,
            },
            buttonNext: {
              borderRadius: '8px',
              fontWeight: 600,
              outline: 'none',
            }
          }}
          locale={{
            skip: trmlOnboarding("skipTour"),
            next: trmlOnboarding("next"),
            back: trmlOnboarding("back"),
            last: trmlOnboarding("finish"),
          }}
        />
      )}

      {/* Help Button to restart tour */}
      <div className="fixed bottom-6 left-6 z-[100]">
        <motion.button
          onClick={() => setRunTour(true)}
          className="p-3 rounded-full bg-secondary text-secondary-foreground shadow-md hover:shadow-lg transition-all border border-border"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          title={trmlOnboarding("onboardingHelp")}
        >
          <Lightbulb className="w-5 h-5" />
        </motion.button>
      </div>
    </PageTransition>
  )
}
