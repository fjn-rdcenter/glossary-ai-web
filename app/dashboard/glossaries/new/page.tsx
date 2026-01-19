"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageTransition, SlideUp } from "@/components/ui/page-transition";
import { GlossaryForm } from "@/components/glossary/glossary-form";
import { GlossaryResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

export default function NewGlossaryPage() {
  const router = useRouter();

  const handleSuccess = (createdGlossary: GlossaryResponse) => {
    router.push(`/dashboard/glossaries/${createdGlossary.id}`);
  };

  return (
    <PageTransition className="container mx-auto px-6 py-10">
      {/* Header */}
      <SlideUp>
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/dashboard/glossaries")}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-serif font-semibold text-foreground">
              Create Glossary
            </h1>
            <p className="mt-1 text-muted-foreground">
              Define custom terminology for translations
            </p>
          </div>
        </div>
      </SlideUp>

      <GlossaryForm
        mode="create"
        onSuccess={handleSuccess}
        onCancel={() => router.push("/dashboard/glossaries")}
      />
    </PageTransition>
  );
}
