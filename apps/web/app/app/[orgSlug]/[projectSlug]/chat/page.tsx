import { redirect } from "next/navigation";

export default async function LegacyAppChatRedirect({
  params,
}: {
  params: Promise<{ orgSlug: string; projectSlug: string }>;
}) {
  const { orgSlug, projectSlug } = await params;
  redirect(`/app/${orgSlug}/${projectSlug}/c`);
}
