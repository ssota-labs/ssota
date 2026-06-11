import { redirect } from "next/navigation";
import { DEFAULT_PROJECT, graphPath } from "@/lib/console/paths";

export default function LegacyHomepageAgentRedirect() {
  redirect(graphPath(DEFAULT_PROJECT, "verticals", "homepage-agent"));
}
