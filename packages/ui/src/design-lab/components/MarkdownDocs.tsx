import { code } from "@streamdown/code";
import { Streamdown } from "streamdown";

import { useDesignLab } from "../context/design-lab-context";

type MarkdownDocsProps = {
  content: string;
};

export function MarkdownDocs({ content }: MarkdownDocsProps) {
  const { isDark } = useDesignLab();

  return (
    <Streamdown
      mode="static"
      className="design-lab-streamdown"
      plugins={{ code }}
      shikiTheme={
        isDark
          ? ["github-dark", "github-dark"]
          : ["github-light", "github-light"]
      }
      lineNumbers={false}
      controls={{
        code: true,
        table: true,
      }}
    >
      {content}
    </Streamdown>
  );
}
