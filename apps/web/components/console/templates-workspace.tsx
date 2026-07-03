"use client";

import { PackageIcon } from "@phosphor-icons/react";
import { BrowseWorkspace } from "@/components/console/browse-workspace";

type TemplateCard = {
  id: string;
  name: string;
  description: string;
  category?: string;
};

type TemplatesWorkspaceProps = {
  templates: TemplateCard[];
  title?: string;
  description?: string;
};

export function TemplatesWorkspace({
  templates,
  title = "Templates",
  description = "Teamspace starter packs — catalog, agents, and page trees applied at onboarding.",
}: TemplatesWorkspaceProps) {
  return (
    <BrowseWorkspace.Frame testId="templates-workspace">
      <BrowseWorkspace.Header title={title} description={description} />
      <BrowseWorkspace.Section label="Available templates">
        {templates.length > 0 ? (
          <BrowseWorkspace.Grid columns="two">
            {templates.map((template) => (
              <BrowseWorkspace.Card
                key={template.id}
                title={template.name}
                subtitle={template.category}
                description={template.description}
                icon={<PackageIcon className="size-4" />}
                onSelect={() => {}}
                className="cursor-default"
              />
            ))}
          </BrowseWorkspace.Grid>
        ) : (
          <BrowseWorkspace.Empty>No templates available.</BrowseWorkspace.Empty>
        )}
      </BrowseWorkspace.Section>
    </BrowseWorkspace.Frame>
  );
}
