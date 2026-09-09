import {GlossaryFormView} from "../../glossary-form-view";

export default async function EditGlossaryPage({
  params,
}: {
  params: Promise<{id: string}>;
}) {
  const {id} = await params;

  return <GlossaryFormView glossaryId={id} mode="edit" />;
}
