import { redirect } from "next/navigation";
import { LabSandboxShell } from "@/components/lab-sandbox/lab-sandbox-shell";
import { LabSandboxProvider } from "@/lib/lab-sandbox/lab-sandbox-context";
import { isSandboxLabEnabled } from "@/lib/lab-sandbox/sandbox-lab-enabled";

export const metadata = {
  title: "SSOTA Lab",
  description: "Frontend sandbox for catalog, page, and nav data models",
};

export default function LabLayout({ children }: { children: React.ReactNode }) {
  if (!isSandboxLabEnabled()) {
    redirect("/");
  }

  return (
    <LabSandboxProvider>
      <LabSandboxShell>{children}</LabSandboxShell>
    </LabSandboxProvider>
  );
}
