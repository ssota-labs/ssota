"use client";

import { useMemo } from "react";
import { useLocale } from "@/components/i18n/locale-provider";
import { BrowseWorkspace } from "@/components/console/browse-workspace";
import { ConnectorBrowseCard } from "@/components/connectors/connectors-view";
import {
  CONNECTOR_THEMES,
  type ConnectorDef,
} from "@/lib/connect/connectors";
import type { createTranslator } from "@/lib/i18n";
import { VisualFrame } from "@/components/landing/landing-solution-visuals";

/** 랜딩 데모용 연결 상태 — connectors 페이지 카드 하이라이트와 동일 패턴 */
const LANDING_CONNECTED = new Set([
  "github",
  "slack",
  "linear",
  "notion",
  "googledrive",
]);

/** Theme group → i18n key (Korean overrides; English falls back to registry label). */
const MCP_THEME_KEYS: Record<string, string> = {
  Productivity: "landing.preview.mcpThemeProductivity",
  Communication: "landing.preview.mcpThemeCommunication",
  Developer: "landing.preview.mcpThemeDeveloper",
  Storage: "landing.preview.mcpThemeStorage",
  "CRM & Sales": "landing.preview.mcpThemeCrmSales",
  Design: "landing.preview.mcpThemeDesign",
  Support: "landing.preview.mcpThemeSupport",
  Social: "landing.preview.mcpThemeSocial",
};

function localizedThemeLabel(
  theme: string,
  t: ReturnType<typeof createTranslator>,
) {
  const key = MCP_THEME_KEYS[theme];
  if (!key) return theme;
  const translated = t(key);
  return translated === key ? theme : translated;
}

function localizedConnectorDescription(
  connector: ConnectorDef,
  t: ReturnType<typeof createTranslator>,
): string {
  const key = `landing.preview.mcpDesc.${connector.provider}`;
  const translated = t(key);
  return translated === key ? connector.description : translated;
}

export function LandingMcpConnectorsPreview({
  connectors,
}: {
  connectors: ConnectorDef[];
}) {
  const { t } = useLocale();
  const groups = useMemo(
    () =>
      CONNECTOR_THEMES.map((theme) => ({
        theme,
        themeLabel: localizedThemeLabel(theme, t),
        items: connectors.filter((c) => c.theme === theme),
      })).filter((g) => g.items.length > 0),
    [connectors, t],
  );

  const connectedCount = useMemo(() => {
    let count = 0;
    for (const connector of connectors) {
      if (LANDING_CONNECTED.has(connector.provider)) count += 1;
    }
    return count;
  }, [connectors]);

  return (
    <VisualFrame label={t("landing.preview.mcpVisualLabel")}>
      <BrowseWorkspace.Frame className="bg-muted/10" testId="landing-mcp-connectors">
        <BrowseWorkspace.Header
          title={t("landing.solution.mcpTitle")}
          description={t("landing.solution.mcpDescription", {
            count: connectedCount,
          })}
        />

        {groups.map((group) => (
          <BrowseWorkspace.Section key={group.theme} label={group.themeLabel}>
            <BrowseWorkspace.Grid columns="two">
              {group.items.map((connector) => (
                <ConnectorBrowseCard
                  key={connector.provider}
                  connector={{
                    ...connector,
                    description: localizedConnectorDescription(connector, t),
                  }}
                  connected={LANDING_CONNECTED.has(connector.provider)}
                  connectedBadgeLabel={t("landing.preview.mcpConnected")}
                  offBadgeLabel={t("landing.preview.mcpOff")}
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
