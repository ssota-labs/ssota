"use client";

import { useMemo } from "react";
import { BrowseWorkspace } from "@/components/console/browse-workspace";
import { ConnectorBrowseCard } from "@/components/connectors/connectors-view";
import {
  CONNECTOR_THEMES,
  type ConnectorDef,
} from "@/lib/connect/connectors";
import { VisualFrame } from "@/components/landing/landing-solution-visuals";

/** 랜딩 데모용 연결 상태 — connectors 페이지 카드 하이라이트와 동일 패턴 */
const LANDING_CONNECTED = new Set([
  "github",
  "slack",
  "linear",
  "notion",
  "googledrive",
]);

export function LandingMcpConnectorsPreview({
  connectors,
}: {
  connectors: ConnectorDef[];
}) {
  const groups = useMemo(
    () =>
      CONNECTOR_THEMES.map((theme) => ({
        theme,
        items: connectors.filter((c) => c.theme === theme),
      })).filter((g) => g.items.length > 0),
    [connectors],
  );

  const connectedCount = useMemo(() => {
    let count = 0;
    for (const connector of connectors) {
      if (LANDING_CONNECTED.has(connector.provider)) count += 1;
    }
    return count;
  }, [connectors]);

  return (
    <VisualFrame label="MCP connections">
      <BrowseWorkspace.Frame className="bg-muted/10" testId="landing-mcp-connectors">
        <BrowseWorkspace.Header
          title="Connectors"
          description={`Browse and manage the apps your agent can use. ${connectedCount} connected.`}
        />

        {groups.map((group) => (
          <BrowseWorkspace.Section key={group.theme} label={group.theme}>
            <BrowseWorkspace.Grid>
              {group.items.map((connector) => (
                <ConnectorBrowseCard
                  key={connector.provider}
                  connector={connector}
                  connected={LANDING_CONNECTED.has(connector.provider)}
                  onSelect={() => {}}
                  interactive={false}
                />
              ))}
            </BrowseWorkspace.Grid>
          </BrowseWorkspace.Section>
        ))}
      </BrowseWorkspace.Frame>
    </VisualFrame>
  );
}
