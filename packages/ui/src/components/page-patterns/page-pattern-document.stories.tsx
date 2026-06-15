import type { Meta, StoryObj } from "@storybook/react-vite";

import { PagePatternDocument } from "./page-pattern-document";

const meta = {
  title: "PagePatterns/Document",
  component: PagePatternDocument,
  tags: ["autodocs"],
} satisfies Meta<typeof PagePatternDocument>;

export default meta;
type Story = StoryObj<typeof PagePatternDocument>;

const sampleMarkdown = `# PRD — Payment UX improvement

## Goals
- Reduce checkout friction
- Improve mobile conversion

## Scope
| Area | Owner |
|------|-------|
| Checkout | Product |
| Payments API | Engineering |

## Open questions
1. Which payment providers for v1?
2. Rollout strategy for existing users?
`;

export const PrdPreview: Story = {
  render: () => (
    <PagePatternDocument
      title="Payment UX improvement PRD"
      status="draft"
      content={sampleMarkdown}
      onEdit={() => undefined}
    />
  ),
};

export const Empty: Story = {
  render: () => (
    <PagePatternDocument
      title="Data model"
      status="empty"
      emptyState={
        <div className="flex h-48 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
          Create the first evergreen document
        </div>
      }
    />
  ),
};
