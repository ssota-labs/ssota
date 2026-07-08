"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { FormValuesContext, useAction, useFormValues } from "../context";
import { boundNode, boundNodes } from "../bindings";
import type {
  BindingContext,
  CatalogComponent,
  CatalogRenderArgs,
} from "../types";

/** A form: collects its Field values and hands them to a Button's action. */
function FormEl({
  columns,
  children,
}: {
  columns?: number;
  children: ReactNode;
}) {
  const [values, setValues] = useState<Record<string, unknown>>({});
  const setValue = (name: string, value: unknown) =>
    setValues((prev) => ({ ...prev, [name]: value }));
  const layout =
    columns === 2 ? "grid grid-cols-1 gap-3 sm:grid-cols-2" : "space-y-3";
  return (
    <FormValuesContext.Provider value={{ values, setValue }}>
      <form className={layout} onSubmit={(e) => e.preventDefault()}>
        {children}
      </form>
    </FormValuesContext.Provider>
  );
}

type FieldType =
  | "text"
  | "email"
  | "number"
  | "date"
  | "textarea"
  | "select"
  | "checkbox"
  | "switch"
  | "relation";

/** A candidate node offered by a relation field (from a binding or inline fallback). */
type RelationCandidate = { id: string; title: string };

/** Combobox option shape ({value,label} is auto-detected by Base UI Combobox). */
type RelationOption = { value: string; label: string };

/** A typed form field that writes its value into the enclosing Form. */
function FieldEl({
  name,
  label,
  placeholder,
  inputType,
  options,
  required,
  multiple,
  candidates,
}: {
  name: string;
  label?: string;
  placeholder?: string;
  inputType?: string;
  options?: string[];
  required?: boolean;
  multiple?: boolean;
  candidates?: RelationCandidate[];
}) {
  const form = useFormValues();
  const raw = form?.values[name];
  const setVal = (v: unknown) => form?.setValue(name, v);
  const type = (inputType ?? "text") as FieldType;

  const labelEl = label ? (
    <Label htmlFor={name}>
      {label}
      {required ? <span className="text-destructive"> *</span> : null}
    </Label>
  ) : null;

  // Boolean controls render inline with their label.
  if (type === "checkbox" || type === "switch") {
    const checked = Boolean(raw);
    const control =
      type === "switch" ? (
        <Switch
          id={name}
          checked={checked}
          onCheckedChange={(c) => setVal(Boolean(c))}
        />
      ) : (
        <Checkbox
          id={name}
          checked={checked}
          onCheckedChange={(c) => setVal(Boolean(c))}
        />
      );
    return (
      <div className="flex items-center gap-2">
        {control}
        {label ? <Label htmlFor={name}>{label}</Label> : null}
      </div>
    );
  }

  // Relation: pick an existing node (to reference / build an edge) via combobox.
  if (type === "relation") {
    return (
      <RelationFieldEl
        name={name}
        label={label}
        placeholder={placeholder}
        required={required}
        multiple={multiple}
        candidates={candidates ?? []}
      />
    );
  }

  let control: ReactNode;
  if (type === "textarea") {
    control = (
      <Textarea
        id={name}
        placeholder={placeholder}
        value={String(raw ?? "")}
        onChange={(e) => setVal(e.target.value)}
      />
    );
  } else if (type === "select") {
    control = (
      <NativeSelect
        id={name}
        className="w-full"
        value={String(raw ?? "")}
        onChange={(e) => setVal(e.target.value)}
      >
        <NativeSelectOption value="">
          {placeholder ?? "선택…"}
        </NativeSelectOption>
        {(options ?? []).map((o) => (
          <NativeSelectOption key={o} value={o}>
            {o}
          </NativeSelectOption>
        ))}
      </NativeSelect>
    );
  } else {
    // text | email | number | date
    control = (
      <Input
        id={name}
        type={type}
        placeholder={placeholder}
        value={raw == null ? "" : String(raw)}
        onChange={(e) =>
          setVal(
            type === "number"
              ? e.target.value === ""
                ? ""
                : Number(e.target.value)
              : e.target.value,
          )
        }
      />
    );
  }
  return (
    <div className="space-y-1.5">
      {labelEl}
      {control}
    </div>
  );
}

/**
 * A relation field: pick existing node(s) from candidate nodes via a searchable
 * combobox, writing the selected nodeId(s) into the enclosing Form. This unlocks
 * form-driven edge creation — a `create_edge` action can read the picked id as
 * `{ $input: "<name>" }`.
 */
function RelationFieldEl({
  name,
  label,
  placeholder,
  required,
  multiple,
  candidates,
}: {
  name: string;
  label?: string;
  placeholder?: string;
  required?: boolean;
  multiple?: boolean;
  candidates: RelationCandidate[];
}) {
  const form = useFormValues();
  const raw = form?.values[name];
  const options: RelationOption[] = candidates.map((c) => ({
    value: c.id,
    label: c.title,
  }));

  const labelEl = label ? (
    <Label htmlFor={name}>
      {label}
      {required ? <span className="text-destructive"> *</span> : null}
    </Label>
  ) : null;

  // No candidate nodes → disabled control with an explicit empty message.
  if (options.length === 0) {
    return (
      <div className="space-y-1.5">
        {labelEl}
        <Input id={name} disabled readOnly placeholder="선택할 항목이 없습니다" />
      </div>
    );
  }

  const sameOption = (a: RelationOption, b: RelationOption) =>
    a.value === b.value;
  const optionLabel = (o: RelationOption) => o.label;

  // Shared input + popup; only the Combobox Root props differ per selection mode.
  const list = (
    <>
      <ComboboxInput
        className="w-full"
        placeholder={placeholder ?? "검색…"}
        showClear
      />
      <ComboboxContent>
        <ComboboxEmpty>일치하는 항목이 없습니다</ComboboxEmpty>
        <ComboboxList>
          {options.map((o) => (
            <ComboboxItem key={o.value} value={o}>
              {o.label}
            </ComboboxItem>
          ))}
        </ComboboxList>
      </ComboboxContent>
    </>
  );

  if (multiple) {
    const ids = Array.isArray(raw)
      ? raw.filter((x): x is string => typeof x === "string")
      : [];
    const selected = ids
      .map((id) => options.find((o) => o.value === id))
      .filter((o): o is RelationOption => Boolean(o));
    return (
      <div className="space-y-1.5">
        {labelEl}
        <Combobox
          multiple
          items={options}
          value={selected}
          onValueChange={(vals) =>
            form?.setValue(
              name,
              vals.map((o) => o.value),
            )
          }
          isItemEqualToValue={sameOption}
          itemToStringLabel={optionLabel}
        >
          {list}
        </Combobox>
        {selected.length > 0 ? (
          <p className="text-muted-foreground text-xs">
            선택됨: {selected.map((o) => o.label).join(", ")}
          </p>
        ) : null}
      </div>
    );
  }

  const current = typeof raw === "string" ? raw : "";
  const selected = options.find((o) => o.value === current) ?? null;
  return (
    <div className="space-y-1.5">
      {labelEl}
      <Combobox
        items={options}
        value={selected}
        onValueChange={(val) => form?.setValue(name, val ? val.value : "")}
        isItemEqualToValue={sameOption}
        itemToStringLabel={optionLabel}
      >
        {list}
      </Combobox>
    </div>
  );
}

function ButtonEl({
  actionKey,
  label,
  variant,
}: {
  actionKey?: string;
  label: string;
  variant?: "default" | "secondary" | "outline" | "ghost" | "destructive";
}) {
  const onAction = useAction();
  const form = useFormValues();
  const [pending, setPending] = useState(false);
  const disabled = !onAction || !actionKey || pending;
  return (
    <Button
      type="button"
      variant={variant ?? "default"}
      disabled={disabled}
      onClick={async () => {
        if (!onAction || !actionKey) return;
        setPending(true);
        try {
          await onAction(actionKey, form?.values ?? {});
        } finally {
          setPending(false);
        }
      }}
    >
      {pending ? "…" : label}
    </Button>
  );
}

/** A standalone field bound to a node property, saved via an action as `{ value }`. */
function ActionFieldEl({
  actionKey,
  label,
  initialValue,
  kind = "input",
  options,
  placeholder,
}: {
  actionKey?: string;
  label?: string;
  initialValue?: string;
  kind?: "input" | "textarea" | "select";
  options?: string[];
  placeholder?: string;
}) {
  const onAction = useAction();
  const [value, setValue] = useState(initialValue ?? "");
  const commit = (v: string) => {
    if (onAction && actionKey) void onAction(actionKey, { value: v });
  };
  return (
    <div className="space-y-1.5">
      {label ? <Label>{label}</Label> : null}
      {kind === "textarea" ? (
        <Textarea
          value={value}
          placeholder={placeholder}
          onChange={(e) => setValue(e.target.value)}
          onBlur={() => commit(value)}
        />
      ) : kind === "select" ? (
        <NativeSelect
          className="w-full"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            commit(e.target.value);
          }}
        >
          {(options ?? []).map((o) => (
            <NativeSelectOption key={o} value={o}>
              {o}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      ) : (
        <Input
          value={value}
          placeholder={placeholder}
          onChange={(e) => setValue(e.target.value)}
          onBlur={() => commit(value)}
        />
      )}
    </div>
  );
}

function actionField(kind: "input" | "textarea" | "select"): CatalogComponent {
  function ActionField({ props, bindingData }: CatalogRenderArgs) {
    const node = boundNode(bindingData, props);
    const field = typeof props.field === "string" ? props.field : undefined;
    const initialValue =
      field && node?.properties
        ? String(node.properties[field] ?? "")
        : typeof props.value === "string"
          ? props.value
          : "";
    return (
      <ActionFieldEl
        actionKey={typeof props.action === "string" ? props.action : undefined}
        label={props.label ? String(props.label) : undefined}
        placeholder={props.placeholder ? String(props.placeholder) : undefined}
        initialValue={initialValue}
        kind={kind}
        options={
          Array.isArray(props.options) ? (props.options as string[]) : undefined
        }
      />
    );
  }
  ActionField.displayName = `ActionField(${kind})`;
  return ActionField;
}

/**
 * Resolve relation-field candidate nodes: prefer `optionsBinding` (query binding
 * → nodes via `boundNodes`), else fall back to an inline `options` array (strings
 * or `{ id, title }` objects). Runs in the hook-free catalog fn.
 */
function resolveRelationCandidates(
  bindingData: BindingContext,
  optionsBinding: string | undefined,
  inlineOptions: unknown,
): RelationCandidate[] {
  if (optionsBinding) {
    return boundNodes(bindingData, { binding: optionsBinding }).map((n) => ({
      id: n.id,
      title: n.title,
    }));
  }
  if (Array.isArray(inlineOptions)) {
    return inlineOptions.flatMap((o): RelationCandidate[] => {
      if (typeof o === "string") return [{ id: o, title: o }];
      if (o && typeof o === "object" && "id" in o) {
        const rec = o as Record<string, unknown>;
        return [{ id: String(rec.id), title: String(rec.title ?? rec.id) }];
      }
      return [];
    });
  }
  return [];
}

/** Input / action components. */
export const formComponents: Record<string, CatalogComponent> = {
  Form: ({ props, children }) => (
    <FormEl columns={typeof props.columns === "number" ? props.columns : undefined}>
      {children}
    </FormEl>
  ),
  Field: ({ elementId, props, bindingData }) => {
    const inputType = props.inputType ? String(props.inputType) : undefined;
    const candidates =
      inputType === "relation"
        ? resolveRelationCandidates(
            bindingData,
            typeof props.optionsBinding === "string"
              ? props.optionsBinding
              : undefined,
            props.options,
          )
        : undefined;
    return (
      <FieldEl
        name={String(props.name ?? elementId)}
        label={props.label ? String(props.label) : undefined}
        placeholder={props.placeholder ? String(props.placeholder) : undefined}
        inputType={inputType}
        options={
          Array.isArray(props.options) ? (props.options as string[]) : undefined
        }
        required={props.required === true}
        multiple={props.multiple === true}
        candidates={candidates}
      />
    );
  },
  Button: ({ props }) => (
    <ButtonEl
      actionKey={typeof props.action === "string" ? props.action : undefined}
      label={String(props.label ?? "Submit")}
      variant={
        typeof props.variant === "string"
          ? (props.variant as "default" | "secondary" | "outline")
          : undefined
      }
    />
  ),
  Input: actionField("input"),
  Textarea: actionField("textarea"),
  Select: actionField("select"),
};
