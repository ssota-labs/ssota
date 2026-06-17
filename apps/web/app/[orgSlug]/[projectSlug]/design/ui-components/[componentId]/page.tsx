import { DesignStudioPage } from "@/components/console/design-studio/design-studio-page";

export default async function DesignUiComponentEditorPage({
  params,
}: {
  params: Promise<{
    orgSlug: string;
    projectSlug: string;
    componentId: string;
  }>;
}) {
  const { orgSlug, projectSlug, componentId } = await params;

  return (
    <DesignStudioPage
      orgSlug={orgSlug}
      projectSlug={projectSlug}
      componentId={componentId}
    />
  );
}
