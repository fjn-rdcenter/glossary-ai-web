"use client";

import { SourceDocumentTable } from "@/components/documents/source-document-table";
import { PageTransition } from "@/components/ui/page-transition";

export default function DocumentsPage() {
  return (
    <PageTransition className="space-y-8">
      <SourceDocumentTable />
    </PageTransition>
  );
}
