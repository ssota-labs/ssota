import type { SkillCatalogSource } from "@ssota/contracts";
import type { DiscoveredSkill, SkillLibraryStatus } from "./discover.js";
import { uniquifySkillKey } from "./skill-key.js";

export interface LibrarySkillRef {
  id: string;
  key: string;
  contentHash: string | null;
  catalogSource?: SkillCatalogSource;
  importOrigin?: {
    type: "folder";
    rootName?: string;
    skillPath?: string;
  };
  packageHash?: string;
}

export interface MatchLibraryContext {
  githubRepo?: string;
  folderRootName?: string;
}

function provenanceMatches(
  existing: LibrarySkillRef,
  discovered: DiscoveredSkill,
  ctx: MatchLibraryContext,
): boolean {
  if (ctx.githubRepo && existing.catalogSource) {
    return (
      existing.catalogSource.source === ctx.githubRepo &&
      existing.catalogSource.skillPath === discovered.skillPath
    );
  }
  if (ctx.folderRootName && existing.importOrigin?.type === "folder") {
    return (
      existing.importOrigin.rootName === ctx.folderRootName &&
      existing.importOrigin.skillPath === discovered.skillPath
    );
  }
  return false;
}

/** Attach libraryStatus / resolvedKey / existingSkillId to discovered skills. */
export function matchDiscoveredSkillsToLibrary(
  discovered: DiscoveredSkill[],
  library: LibrarySkillRef[],
  ctx: MatchLibraryContext = {},
): DiscoveredSkill[] {
  const takenKeys = new Set(library.map((s) => s.key.toLowerCase()));

  return discovered.map((skill) => {
    const provenanceMatch = library.find((entry) =>
      provenanceMatches(entry, skill, ctx),
    );

    if (provenanceMatch) {
      const sameHash =
        skill.contentHash != null &&
        provenanceMatch.contentHash != null &&
        skill.contentHash === provenanceMatch.contentHash;

      const status: SkillLibraryStatus = sameHash ? "imported" : "update";
      return {
        ...skill,
        libraryStatus: status,
        resolvedKey: provenanceMatch.key,
        existingSkillId: provenanceMatch.id,
      };
    }

    const keyOwner = library.find(
      (entry) => entry.key.toLowerCase() === skill.suggestedKey.toLowerCase(),
    );

    if (keyOwner) {
      const resolvedKey = uniquifySkillKey(skill.suggestedKey, takenKeys);
      return {
        ...skill,
        libraryStatus: "key_collision" as const,
        resolvedKey,
        existingSkillId: keyOwner.id,
      };
    }

    return {
      ...skill,
      libraryStatus: "new" as const,
      resolvedKey: skill.suggestedKey,
    };
  });
}
