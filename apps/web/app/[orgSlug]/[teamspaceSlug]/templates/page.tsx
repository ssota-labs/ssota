import { redirect } from "next/navigation";

export default function TemplatesRedirectPage({
  params,
}: {
  params: Promise<{ orgSlug: string; teamspaceSlug: string }>;
}) {
  return redirect("/onboarding/template");
}
