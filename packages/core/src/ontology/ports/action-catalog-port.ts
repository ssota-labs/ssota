import type { ActionCatalogRow, UpsertActionInput } from "@ssota/contracts";
import type { ActionReadPort } from "./action-port.js";

/**
 * ActionCatalogPort — L2 액션 타입의 **저장 표면** (org-scoped `action_catalog` 행).
 *
 * `ActionReadPort`(runAction이 보는 읽기 뷰)를 포함하고, 콘솔·에이전트가 액션을
 * 정의·수정·삭제하는 쓰기 메서드를 더한다. 그래프 인스턴스가 아니라 **타입 정의**이므로
 * [ACTION-01]의 runAction 경로가 아니라 L1 catalog write와 같은 급의 정의 쓰기다.
 */
export interface ActionCatalogPort extends ActionReadPort {
  listActionRows(): Promise<ActionCatalogRow[]>;
  getActionRowByKey(key: string): Promise<ActionCatalogRow | null>;
  upsertAction(input: UpsertActionInput): Promise<ActionCatalogRow>;
  deleteAction(key: string): Promise<void>;
}
