import { BUILTIN_TEMPLATES } from "@ssota/adapter-postgres";
import type { TemplateBundle } from "@ssota/contracts";
import { TemplatesWorkspace } from "@/components/console/templates-workspace";

export default function TemplatesPage() {
  return (
    <div className="relative min-h-0 flex-1">
      <TemplatesWorkspace
        templates={BUILTIN_TEMPLATES.map((template: TemplateBundle) => ({
          id: template.meta.id,
          name: template.meta.name,
          description: template.meta.description,
          category: template.meta.category,
        }))}
      />
    </div>
  );
}
