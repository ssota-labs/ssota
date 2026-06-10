/**
 * M6: 노션 프로토타입 1차 마이그레이션 스크립트
 * Documents·Instructions·Actions DB의 대표 항목을 LoopOS 노드/지침으로 시드한다.
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

async function main() {
  const { db, client } = createDb();
  const ports = createActionPorts(db);

  const executorId = "migration-script";

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
    console.log(`Migrated: ${doc.title} → ${JSON.stringify(result)}`);
  }

  console.log("M6 dogfood migration complete.");
  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
