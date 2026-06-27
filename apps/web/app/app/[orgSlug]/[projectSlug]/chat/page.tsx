import { redirect } from "next/navigation";

export default async function LegacyAppChatRedirect({
  params,
}: {
  params: Promise<{ orgSlug: string; teamspaceSlug: string }>;
}) {
  const { orgSlug, teamspaceSlug } = await params;
  redirect(`/app/${orgSlug}/${teamspaceSlug}/c`);
}
