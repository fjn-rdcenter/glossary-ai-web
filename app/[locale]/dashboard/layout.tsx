import type React from "react";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { UserProvider } from "@/components/contexts/user-context";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider defaultOpen={false}>
      <UserProvider>
        <SidebarInset className="bg-muted/20">
          <div className="flex flex-col min-h-screen min-w-0">
            <Header />
            <main className="flex-1 p-6 md:p-8 flex flex-col">
              <div className="flex-1">{children}</div>
              <div className="mt-auto pt-8">
                <Footer />
              </div>
            </main>
          </div>
        </SidebarInset>
        <Sidebar />
      </UserProvider>
    </SidebarProvider>
  );
}
