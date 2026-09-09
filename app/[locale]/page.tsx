import {redirect} from "@/i18n/routing";

type HomePageProps = {
  params: Promise<{locale: string}>;
};

export default async function HomePage({params}: HomePageProps) {
  const {locale} = await params;

  redirect({href: "/login", locale});
}
