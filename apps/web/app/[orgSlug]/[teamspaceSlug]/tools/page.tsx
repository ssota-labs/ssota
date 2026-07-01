import { BUILTIN_TEMPLATES } from "@ssota/adapter-postgres";
import type { TemplateBundle } from "@ssota/contracts";
import { TemplatesWorkspace } from "@/components/console/templates-workspace";
import { getTranslations } from "@/lib/i18n/server";

export default async function ToolsPage() {
  const { t } = await getTranslations();

  return (
    <TemplatesWorkspace
      title={t("nav.tools")}
      templates={BUILTIN_TEMPLATES.map((template: TemplateBundle) => ({
        id: template.meta.id,
        name: template.meta.name,
        description: template.meta.description,
        category: template.meta.category,
      }))}
    />
  );
}
