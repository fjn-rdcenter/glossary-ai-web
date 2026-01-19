import type React from "react";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";

import { Footer } from "@/components/footer";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen bg-muted/20">
      {/* Sidebar - Fixed overlay from right */}
      <Sidebar />

      {/* Main content - Full width */}
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 p-6 md:p-8">
          {children}
          <Footer />
        </main>
      </div>
    </div>
  );
}
