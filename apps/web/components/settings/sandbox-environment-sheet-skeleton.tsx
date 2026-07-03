import { Skeleton } from "@ssota/ui/components/ui/skeleton";
import { SettingsRow } from "@/components/settings/settings-panel";

function FieldSkeleton({ tall = false }: { tall?: boolean }) {
  return <Skeleton className={tall ? "h-20 w-full" : "h-9 w-full"} />;
}

function SwitchSkeleton() {
  return <Skeleton className="h-5 w-9 rounded-full" />;
}

export function SandboxEnvironmentSheetSkeleton() {
  return (
    <div className="space-y-6" data-testid="sandbox-environment-sheet-skeleton">
      <section className="space-y-3">
        <h3 className="text-sm font-medium">General</h3>
        <div className="divide-y rounded-lg border bg-card">
          <SettingsRow title="Name" description="Display name in console and task picker.">
            <FieldSkeleton />
          </SettingsRow>
          <SettingsRow
            title="Key"
            description="Stable catalog key (teamspace-unique). Used in MCP and task bindings."
          >
            <FieldSkeleton />
          </SettingsRow>
          <SettingsRow title="Description" description="Optional summary for builders.">
            <FieldSkeleton tall />
          </SettingsRow>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-medium">Runtime</h3>
        <div className="divide-y rounded-lg border bg-card">
          <SettingsRow title="Runtime image" description="Base VM image for agent shell tools.">
            <FieldSkeleton />
          </SettingsRow>
          <SettingsRow
            title="Working root"
            description="Default cwd and path-policy root inside the VM."
          >
            <FieldSkeleton />
          </SettingsRow>
          <SettingsRow
            title="Exposed ports"
            description="Comma-separated ports to forward (e.g. 3000, 5173)."
          >
            <FieldSkeleton />
          </SettingsRow>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-medium">Repositories</h3>
        <p className="text-xs text-muted-foreground">
          Cloned on provision via credential broker. Mark one as primary for the default
          checkout path.
        </p>
        <div className="space-y-3 rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between gap-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <FieldSkeleton />
          <div className="grid grid-cols-2 gap-2">
            <FieldSkeleton />
            <FieldSkeleton />
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-medium">Bootstrap</h3>
        <div className="divide-y rounded-lg border bg-card">
          <SettingsRow
            title="Setup script"
            description="Shell script run after clone (install deps, build, etc.)."
          >
            <FieldSkeleton tall />
          </SettingsRow>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-medium">Policy</h3>
        <div className="divide-y rounded-lg border bg-card">
          <SettingsRow title="Network egress" description="Allow outbound network from the VM.">
            <SwitchSkeleton />
          </SettingsRow>
          <SettingsRow
            title="Named sandbox"
            description="Resume the same Vercel sandbox when possible."
          >
            <SwitchSkeleton />
          </SettingsRow>
          <SettingsRow
            title="Snapshot on setup"
            description="Capture a snapshot after successful bootstrap."
          >
            <SwitchSkeleton />
          </SettingsRow>
          <SettingsRow
            title="Idle timeout (minutes)"
            description="Stop the VM after inactivity. Leave empty for provider default."
          >
            <FieldSkeleton />
          </SettingsRow>
          <SettingsRow
            title="Allowed env keys"
            description="Env var names agents may inject into shell commands."
          >
            <FieldSkeleton />
          </SettingsRow>
        </div>
      </section>
    </div>
  );
}
