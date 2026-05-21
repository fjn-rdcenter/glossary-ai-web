"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";

export const dynamic = "force-dynamic";

// This page is deprecated — editing is now done via dialog on the detail page.
// Redirect to the detail page.
export default function EditGlossaryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  useEffect(() => {
    router.replace(`/dashboard/glossaries/${id}`);
  }, [id, router]);

  return null;
}
