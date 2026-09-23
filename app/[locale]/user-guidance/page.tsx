import {MEDIA_STORAGE} from "@/api";
import {UserGuidanceView} from "./user-guidance-view";

export default function UserGuidancePage() {
  return <UserGuidanceView mediaStorage={MEDIA_STORAGE} />;
}
