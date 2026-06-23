import type { TemplateMeta } from "@ssota/contracts";

export type OnboardingTemplateOption = Pick<
  TemplateMeta,
  "id" | "name" | "description" | "category"
>;
