import {DashboardShell} from "./dashboard-shell";

export default function DashboardPage() {
  const mediaStorage =
    process.env.MEDIA_STORAGE ?? "http://172.16.6.10:28888/GlossaryAI";

  return <DashboardShell mediaStorage={mediaStorage} />;
}
