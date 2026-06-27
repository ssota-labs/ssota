import { redirect } from "next/navigation";

export default async function LegacyChatRedirect({
  params,
}: {
  params: Promise<{ orgSlug: string; teamspaceSlug: string }>;
}) {
  const { orgSlug, teamspaceSlug } = await params;
  redirect(`/${orgSlug}/${teamspaceSlug}/c`);
}
