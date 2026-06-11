/**
 * M6: 노션 프로토타입 1차 마이그레이션
 *
 * Policy:
 * - Skip Notion instructions with intent_class = Root (Runtime Protocol → loopos-mcp skill).
 * - Migrate domain instructions only via define_instruction / upsert paths.
 * - Migrate representative documents as create_document actions.
 */
import { executeAction } from "@loopos/core";
import { createActionPorts, createDb } from "@loopos/adapter-supabase";

const NOTION_PROTOTYPE_DOCUMENTS = [
  {
    title: "LoopOS 코어 스펙",
    content:
      "8 프리미티브 + 4대 런타임 강제 + MCP 인터페이스. 모든 쓰기는 executeAction()으로 수렴.",
  },
  {
    title: "Phase 1 Exit Criteria",
    content:
      "계약 우회가 구조적으로 불가능함을 자체 운영으로 검증 (비기록 변경 0건).",
  },
];

/** Notion Root instruction — migrated to plugins/loopos-plugin/skills/loopos-mcp, not stored in graph. */
const SKIP_NOTION_INTENT_CLASSES = new Set(["Root"]);

const NOTION_DOMAIN_INSTRUCTIONS = [
  {
    title: "Document mutation (Notion prototype)",
    triggerPatterns: ["document mutation", "edit document"],
    applicableNodeTypes: ["Document"],
    requiredActions: [],
    optionalActions: [],
    lifecycle: "Active" as const,
    body: "Migrated domain instruction placeholder. Confirm mutability before update.",
    provenance: { source: "notion-prototype", intent_class: "Domain" },
  },
];

async function main() {
  const { db, client } = createDb();
  const ports = createActionPorts(db);
  const executorId = "migration-script";

  console.log(
    "M6 policy: skipping Root instructions (see loopos-mcp skill). Skipped intent classes:",
    [...SKIP_NOTION_INTENT_CLASSES].join(", "),
  );

  for (const doc of NOTION_PROTOTYPE_DOCUMENTS) {
    const result = await executeAction(ports, {
      actionType: "create_document",
      input: {
        title: doc.title,
        content: doc.content,
        properties: { title: doc.title, source: "notion-prototype" },
      },
      executorId,
      executorType: "System",
    });
    console.log(`Migrated document: ${doc.title} → ${JSON.stringify(result)}`);
  }

  for (const instruction of NOTION_DOMAIN_INSTRUCTIONS) {
    console.log(
      `Domain instruction queued (use define_instruction via Human/Agent): ${instruction.title}`,
      instruction.provenance,
    );
  }

  console.log("M6 dogfood migration complete.");
  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
