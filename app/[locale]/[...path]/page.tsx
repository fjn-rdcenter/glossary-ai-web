import {headers} from "next/headers";
import {getBrowserLocale, redirect} from "@/i18n/routing";

export default async function UnknownPage() {
  const acceptLanguage = (await headers()).get("accept-language");

  redirect({href: "/dashboard", locale: getBrowserLocale(acceptLanguage)});
}
