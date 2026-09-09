import {GlossaryDetailView} from "./glossary-detail-view";

export default async function GlossaryDetailPage({
  params,
}: {
  params: Promise<{id: string}>;
}) {
  const {id} = await params;

  return <GlossaryDetailView glossaryId={id} />;
}
