import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import {
  DesignLab,
  buildComponentDocsMeta,
  buildDocsCatalog,
  buildStoryCatalog,
  type DocsModule,
  type StoryModule,
} from "@ssota/ui/design-lab";
import "@ssota/ui/styles/globals.css";

const storyModules = import.meta.glob(
  "../../../packages/ui/src/**/*.stories.tsx",
  { eager: true },
) as Record<string, StoryModule>;

const mdxModules = import.meta.glob(
  "../../../packages/ui/src/**/*.docs.mdx",
  { eager: true },
) as Record<string, DocsModule>;

const stories = buildStoryCatalog(storyModules);
const docsMeta = buildComponentDocsMeta(storyModules);
const docsCatalog = buildDocsCatalog(mdxModules);

const root = document.getElementById("root");
if (!root) throw new Error("Root element not found");

createRoot(root).render(
  <StrictMode>
    <div className="h-screen">
      <DesignLab
        stories={stories}
        docsMeta={docsMeta}
        docsCatalog={docsCatalog}
      />
    </div>
  </StrictMode>,
);
