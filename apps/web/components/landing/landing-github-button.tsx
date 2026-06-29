import Link from "next/link";
import { GitHubDark } from "@ridemountainpig/svgl-react";

const GITHUB_REPO_URL = "https://github.com/ssota-labs/loopos";
const GITHUB_API_URL = "https://api.github.com/repos/ssota-labs/loopos";

function formatStarCount(count: number): string {
  if (count >= 1000) {
    const thousands = count / 1000;
    return thousands >= 100
      ? `${Math.round(thousands)}k`
      : `${thousands.toFixed(1)}k`;
  }
  return String(count);
}

async function fetchStarCount(): Promise<string | null> {
  try {
    const response = await fetch(GITHUB_API_URL, {
      headers: { Accept: "application/vnd.github+json" },
      next: { revalidate: 3600 },
    });
    if (!response.ok) return null;

    const data = (await response.json()) as { stargazers_count?: number };
    if (typeof data.stargazers_count !== "number") return null;

    return formatStarCount(data.stargazers_count);
  } catch {
    return null;
  }
}

export async function LandingGithubButton() {
  const starCount = await fetchStarCount();

  return (
    <Link
      href={GITHUB_REPO_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex h-8 shrink-0 items-center gap-2 rounded-full border border-white/10 bg-black/35 px-3 text-xs font-medium text-white backdrop-blur-sm transition-colors hover:bg-black/50"
    >
      <GitHubDark className="size-4" aria-hidden />
      <span>GitHub</span>
      {starCount ? (
        <>
          <span className="h-4 w-px bg-white/20" aria-hidden />
          <span className="text-white/90">{starCount}</span>
        </>
      ) : null}
    </Link>
  );
}
