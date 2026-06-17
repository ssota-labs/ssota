"use client";

import { Badge } from "@ssota/ui/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@ssota/ui/components/ui/dropdown-menu";
import { useLocale } from "@/components/i18n/locale-provider";
import {
  DOC_STATUS_LABELS,
  DOC_STATUS_OPTIONS,
  type DocStatus,
} from "@/lib/roadmap/doc-status";

type RoadmapDocStatusControlProps = {
  value: DocStatus;
  onChange: (status: DocStatus) => void;
  disabled?: boolean;
};

export function RoadmapDocStatusControl({
  value,
  onChange,
  disabled = false,
}: RoadmapDocStatusControlProps) {
  const { t } = useLocale();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={disabled}
        nativeButton={false}
        render={
          <Badge
            variant="secondary"
            className="cursor-pointer hover:bg-secondary/80"
            aria-label={t("roadmap.docStatusLabel")}
          />
        }
      >
        {DOC_STATUS_LABELS[value]}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-40">
        <DropdownMenuLabel>{t("roadmap.docStatusLabel")}</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={value}
          onValueChange={(next) => {
            if (next) onChange(next as DocStatus);
          }}
        >
          {DOC_STATUS_OPTIONS.map((status) => (
            <DropdownMenuRadioItem key={status} value={status}>
              {DOC_STATUS_LABELS[status]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
