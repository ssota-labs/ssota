import { redirect } from "next/navigation";

export default async function LegacyChatRedirect({
  params,
}: {
  params: Promise<{ orgSlug: string; projectSlug: string }>;
}) {
  const { orgSlug, projectSlug } = await params;
  redirect(`/${orgSlug}/${projectSlug}/c`);
}
