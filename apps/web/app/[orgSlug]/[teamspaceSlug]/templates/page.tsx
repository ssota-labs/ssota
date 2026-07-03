import { redirect } from "next/navigation";

export default async function TemplatesRedirectPage({
  params,
}: {
  params: Promise<{ orgSlug: string; teamspaceSlug: string }>;
}) {
  const { orgSlug, teamspaceSlug } = await params;
  redirect(`/${orgSlug}/${teamspaceSlug}/tools`);
}
