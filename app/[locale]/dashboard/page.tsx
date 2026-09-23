import {MEDIA_STORAGE} from "@/api";
import {DashboardShell} from "./dashboard-shell";

export default function DashboardPage() {
  return <DashboardShell mediaStorage={MEDIA_STORAGE} />;
}
