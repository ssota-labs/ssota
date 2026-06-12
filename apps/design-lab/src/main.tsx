import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { DesignLab, buildStoryCatalog, type StoryModule } from "@ssota/ui/design-lab";
import "@ssota/ui/styles/globals.css";

const storyModules = import.meta.glob(
  "../../../packages/ui/src/**/*.stories.tsx",
  { eager: true },
) as Record<string, StoryModule>;

const stories = buildStoryCatalog(storyModules);

const root = document.getElementById("root");
if (!root) throw new Error("Root element not found");

createRoot(root).render(
  <StrictMode>
    <div className="h-screen">
      <DesignLab stories={stories} />
    </div>
  </StrictMode>,
);
