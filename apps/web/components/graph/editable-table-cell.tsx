"use client";

import { useTransition } from "react";
import { updateNodePropertiesFormAction } from "@/app/actions";
import {
  PropertyFieldDisplay,
  PropertyFieldEditor,
} from "@/components/graph/property-field-editor";
import type { PropertyFieldDefinition } from "@/lib/graph/property-field-types";
import { cn } from "@ssota/ui/lib/utils";

type EditableTableCellProps = {
  projectId: string;
  nodeSlug: string;
  nodeId: string;
  field: PropertyFieldDefinition;
  value: unknown;
  isActive: boolean;
  isEditing: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onCancelEdit: () => void;
  onUpdated: (value: unknown) => void;
};

export function EditableTableCell({
  projectId,
  nodeSlug,
  nodeId,
  field,
  value,
  isActive,
  isEditing,
  onSelect,
  onEdit,
  onCancelEdit,
  onUpdated,
}: EditableTableCellProps) {
  const [isPending, startTransition] = useTransition();

  function saveProperty(nextValue: unknown) {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("projectId", projectId);
      formData.set("nodeSlug", nodeSlug);
      formData.set("nodeId", nodeId);
      formData.set("propertyKey", field.key);
      formData.set("value", JSON.stringify(nextValue));
      const result = await updateNodePropertiesFormAction(formData);
      if (result.ok) {
        onUpdated(nextValue);
      }
      onCancelEdit();
    });
  }

  return (
    <div
      role="gridcell"
      tabIndex={0}
      className={cn(
        "supabase-grid-cell relative flex h-8 min-w-[132px] max-w-[280px] items-center px-0",
        isActive && !isEditing && "supabase-grid-cell-active",
        isEditing && "supabase-grid-cell-editing",
        isPending && "opacity-70",
      )}
      onClick={(event) => {
        event.stopPropagation();
        onSelect();
      }}
      onDoubleClick={(event) => {
        event.stopPropagation();
        onEdit();
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") onEdit();
      }}
    >
      {isEditing ? (
        <PropertyFieldEditor
          field={field}
          value={value}
          variant="inline"
          autoFocus
          disabled={isPending}
          onChange={() => {}}
          onCommit={saveProperty}
        />
      ) : (
        <div className="truncate px-2 text-xs">
          <PropertyFieldDisplay field={field} value={value} />
        </div>
      )}
    </div>
  );
}
