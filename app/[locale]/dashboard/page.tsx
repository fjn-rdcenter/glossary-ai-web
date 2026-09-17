import {DashboardShell} from "./dashboard-shell";

export default function DashboardPage() {
  const mediaStorage =
    process.env.MEDIA_STORAGE ??
    `${process.env.NEXT_PUBLIC_BASE_PATH || "/new"}/user-guidance`;

  return <DashboardShell mediaStorage={mediaStorage} />;
}
