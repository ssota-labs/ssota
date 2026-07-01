import { Skeleton } from "@ssota/ui/components/ui/skeleton";
import {
  connectorCardClassName,
  connectorCardDescriptionClassName,
  connectorCardTextClassName,
  connectorCardTitleClassName,
  connectorIconWrapClassName,
} from "@/components/connectors/connector-card-styles";

/** Mirrors `BrowseWorkspace.Card` / `ConnectorBrowseCard` chrome for loading states. */
export function ConnectorCardSkeleton({ showBadge = true }: { showBadge?: boolean }) {
  return (
    <div className={connectorCardClassName} aria-hidden>
      <span className={connectorIconWrapClassName}>
        <Skeleton className="size-5 rounded-sm" />
      </span>
      <span className={connectorCardTextClassName}>
        <span className={connectorCardTitleClassName}>
          <Skeleton className="inline-block h-3.5 w-[7.5rem] max-w-full rounded-sm align-middle" />
        </span>
        <span className={connectorCardDescriptionClassName}>
          <Skeleton className="inline-block h-3 w-full max-w-[12rem] rounded-sm align-middle" />
        </span>
      </span>
      {showBadge ? (
        <Skeleton className="h-5 w-[4.25rem] shrink-0 rounded-md" />
      ) : null}
    </div>
  );
}
