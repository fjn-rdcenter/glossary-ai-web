import {UserGuidanceView} from "./user-guidance-view";

export default function UserGuidancePage() {
  const mediaStorage =
    process.env.MEDIA_STORAGE ?? "http://172.16.6.10:28888/GlossaryAI";

  return <UserGuidanceView mediaStorage={mediaStorage} />;
}
