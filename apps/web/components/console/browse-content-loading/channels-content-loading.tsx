import { ConnectionsBrowseLoading } from "@/components/console/browse-content-loading/connections-browse-loading";

/** Suspense fallback for Channels — matches ConnectorsView card grid layout. */
export function ChannelsContentLoading() {
  return (
    <ConnectionsBrowseLoading
      testId="content-loading-channels"
      title="Channels"
      description={
        <p className="max-w-2xl text-sm text-muted-foreground">
          Connect Slack or Discord so agents can receive inbound messages.
        </p>
      }
      sections={[{ label: "Inbound channels", count: 2 }]}
    />
  );
}
