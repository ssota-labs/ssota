import { ToolcraftApp } from "@repo/toolcraft-runtime/react";

import { starterSchema } from "../app/starter-schema";

export function StarterHome(): React.JSX.Element {
  return <ToolcraftApp className="h-dvh min-h-dvh" schema={starterSchema} />;
}
