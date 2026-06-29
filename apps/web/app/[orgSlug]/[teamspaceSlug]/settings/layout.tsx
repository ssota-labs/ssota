import { SettingsRouteShell } from "@/components/settings/settings-route-shell";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return <SettingsRouteShell>{children}</SettingsRouteShell>;
}

export async function generateMetadata() {
  return { title: "Settings" };
}
