import {UserGuidanceView} from "./user-guidance-view";

export default function UserGuidancePage() {
  const mediaStorage =
    process.env.MEDIA_STORAGE ??
    `${process.env.NEXT_PUBLIC_BASE_PATH || "/new"}/user-guidance`;

  return <UserGuidanceView mediaStorage={mediaStorage} />;
}
