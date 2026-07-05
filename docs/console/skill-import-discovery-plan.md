# Skill Import & Discovery — 구현 플랜

> **상태:** In progress (브랜치 `cursor/skill-import-discovery-28be`)  
> **범위:** GitHub import · 로컬 폴더 import · (참고) Custom 작성  
> **비범위:** Explore 커뮤니티 카탈로그, Agent 바인딩 UX

---

## 0. 진행 현황 (2026-07-05)

| PR | 상태 | 완료 내용 |
|----|------|-----------|
| **PR-1** | ✅ 완료 | `packages/core` discovery 파이프라인, key/hash/validation, plugin manifest, library match, contracts DTO, 단위 테스트 27건 |
| **PR-2** | 🟡 부분 완료 | `skill-github-discover.ts` (tree fetch + discover), `registerSkill` provenance·uniquify, `importSkills` / `discoverGithubSkills` 포트 메서드 — **adapter 단위·통합 테스트 미작성** |
| **PR-3** | ⬜ 미착수 | API `discover/github`, `import` batch |
| **PR-4** | ⬜ 미착수 | 통합 Import 시트 UI |
| **PR-5** | ⬜ 미착수 | Custom 시트 슬림화 + E2E |
| **PR-6** | ⬜ 미착수 | (선택) recursive fallback 등 |

### 추가된 파일 (PR-1 + PR-2)

```
docs/console/skill-import-discovery-plan.md
packages/contracts/src/skill.ts                    # DiscoveredSkill, ImportSkillsInput, importOrigin
packages/core/src/skill/
  skill-key.ts, skill-hash.ts, validate-skill-md.ts
  plugin-manifest.ts, github-discover-paths.ts
  discover.ts, library-match.ts
  *.test.ts
packages/adapter-postgres/src/ports/
  skill-github-discover.ts
  skill-port.ts                                    # provenance-aware registerSkill, import/discover
packages/core/src/ports/skill-read-port.ts         # SkillPort 확장
packages/agent-runtime/src/__tests__/skills.test.ts  # mock port 보강
```

### 다음 작업

1. PR-2 마무리: adapter 테스트 (`discoverGithubSkills` mock, `registerSkill` provenance 거부/ suffix)
2. PR-3: `GET /api/skills/discover/github`, `POST /api/skills/import`
3. PR-4: `SkillImportSheet` — GitHub/Folder 탭 통합, 기존 시트 제거
4. PR-5: Custom key 필드 제거, E2E 갱신

---

## 1. 문제 정의

현재 GitHub / Folder / Custom 시트는 **key, name, description, skill path**를 유저가 직접 입력하게 되어 있다. 이는 import 플로우에 맞지 않는다.

**목표**

- GitHub·폴더 import는 **동일한 discovery + 선택 UI**를 쓴다.
- `name` / `description` / `skillPath`는 **SKILL.md + 생태계 규칙**에서 자동 추출한다.
- SSOTA org library **`key`만** SSOTA 규칙으로 부여·충돌 해소한다.
- **Invalid SKILL.md는 목록에 보이지 않는다** (완전 숨김).
- 이미 라이브러리에 있는 스킬은 **상태 배지로 구분**하고, import 동작을 명확히 한다.

---

## 2. 생태계 조사 요약

### 2.1 공통 표준 — Agent Skills (`agentskills.io`)

모든 주요 에이전트가 따르는 **최소 공통분모**:

| 항목 | 규칙 |
|------|------|
| 파일 | `SKILL.md` (정확한 파일명) |
| frontmatter | `name` (필수), `description` (필수) |
| `name` | 1–64자, `a-z0-9-` only, 앞뒤 `-` 금지, `--` 금지, **부모 디렉터리명과 일치** (권장/대부분 강제) |
| `description` | 1–1024자, 무엇을/언제 쓰는지 + 트리거 키워드 |
| 선택 | `license`, `compatibility`, `metadata`, `allowed-tools` |
| 내부 숨김 | `metadata.internal: true` (skills.sh 관례) |

**핵심:** 생태계에서 `name`은 이미 **동사·명사를 하이픈으로 이은 식별자**다 (`frontend-design`, `deploy-to-vercel`, `code-review`). 별도 “키 생성 AI” 없이 **frontmatter `name` = canonical skill id**로 쓰는 것이 표준에 맞다.

### 2.2 에이전트별 **검색 경로** (skills.sh SSOT)

`skills.sh` (`vercel-labs/skills`)는 68+ 에이전트를 지원하며, **레포 내 conventional 경로 목록**을 SSOT로 유지한다. SSOTA discovery도 이 목록을 **그대로 채택**한다 (중복 구현 방지).

| 에이전트 | `--agent` | 프로젝트 경로 | 글로벌 경로 |
|----------|-----------|---------------|-------------|
| **Cursor** | `cursor` | `.agents/skills/` | `~/.cursor/skills/` |
| **Codex** | `codex` | `.agents/skills/` | `~/.codex/skills/` |
| **Pi** | `pi` | `.pi/skills/` | `~/.pi/agent/skills/` |
| **Hermes** | `hermes-agent` | `.hermes/skills/` | `~/.hermes/skills/` |
| Claude Code | `claude-code` | `.claude/skills/` | `~/.claude/skills/` |
| GitHub Copilot | `github-copilot` | `.agents/skills/` | `~/.copilot/skills/` |
| … | … | (skills.sh README 전체 목록) | … |

**공통 패턴**

- `.agents/skills/` — Codex, Cursor, Copilot, Gemini CLI 등 **다수 에이전트의 교집합**
- 에이전트 전용 dot-dir — `.pi/skills/`, `.hermes/skills/`, `.claude/skills/`, `.cursor/skills/` 등
- 루트 `skills/` — marketplace / monorepo catalog

**Pi 추가 규칙** (참고): `.pi/skills/`·`~/.pi/agent/skills/`에서는 루트 `.md` 단일 파일도 스킬로 인식. SSOTA import v1에서는 **`SKILL.md` 디렉터리 레이아웃만** 지원 (단일 `.md` 루트 스킬은 v2).

**Hermes 추가 규칙** (참고): `~/.hermes/skills/<category>/<skill>/SKILL.md` 카테고리 중첩. discovery 시 **경로 깊이 1–2**로 흡수 가능 (skills catalog layout과 동일).

### 2.3 플러그인 매니페스트 (명시적 선언)

| 플랫폼 | 경로 | 용도 |
|--------|------|------|
| **Claude Code / skills.sh** | `.claude-plugin/marketplace.json` | 멀티 플러그인 카탈로그 |
| | `.claude-plugin/plugin.json` | 단일 플러그인 |
| **Cursor** | `.cursor-plugin/plugin.json` | 스킬·rules·MCP 번들 |

**Claude `marketplace.json` 예시**

```json
{
  "metadata": { "pluginRoot": "./plugins" },
  "plugins": [
    {
      "name": "document-skills",
      "source": "document-tools",
      "skills": ["./skills/formatter", "./skills/review"]
    }
  ]
}
```

**Cursor `plugin.json` 예시** (SSOTA 자체 플러그인)

```json
{
  "name": "ssota-plugin",
  "skills": "skills"
}
```

**경로 규칙 (Claude spec):** manifest 내 skill 경로는 `./`로 시작하는 상대경로. `..` traversal 금지. skills.sh `plugin-manifest.ts`와 동일하게 SSOTA에서 검증.

**Discovery 우선순위**

1. Plugin manifest에서 선언된 skill 경로 (Claude → Cursor 순 탐색)
2. Conventional 경로 스캔 (skills.sh 전체 목록 + 루트 `SKILL.md`)
3. (fallback, 기본 OFF) recursive `**/SKILL.md` — v2 또는 “고급” 토글

Manifest에 선언된 경로는 **depth walk 규칙과 무관**하게 해당 경로의 `SKILL.md`를 직접 후보로 등록한다 (skills.sh 동작).

### 2.4 Cursor vs Claude manifest 차이

| | Claude | Cursor |
|---|--------|--------|
| 디렉터리 | `.claude-plugin/` | `.cursor-plugin/` |
| `skills` 필드 | `"./skills/foo"` 배열 | `"skills"` 문자열 또는 배열 가능 |
| 기본 discovery | `skills/` 하위 `SKILL.md` | `skills/` + manifest override |
| marketplace | `marketplace.json` 지원 | (v1: 단일 plugin.json만) |

**SSOTA v1:** `.claude-plugin/*` + `.cursor-plugin/plugin.json` 모두 파싱. Cursor의 `skills: "skills"` → `["./skills"]` 정규화.

---

## 3. 설계 원칙

### 3.1 메타데이터 SSOT

| SSOTA 필드 | Import 시 출처 | 유저 입력 |
|------------|----------------|-----------|
| `description` | `SKILL.md` frontmatter `description` | ❌ |
| `name` (표시명) | frontmatter `name` → **humanize** (§4.2) | ❌ |
| `skillPath` | discovery 결과 (`skills/foo/SKILL.md`) | ❌ |
| `key` | §4 키 규칙 + §5 충돌 해소 | ❌ (Advanced override v2) |
| 파일 본문 | GitHub fetch / 폴더 업로드 원본 | ❌ |

**Custom 작성**만 예외: BlockNote 본문 + (선택) 표시 제목 한 줄 → 서버가 SKILL.md frontmatter로 감싼다.

### 3.2 Invalid 스킬 — 완전 숨김

다음은 discovery 결과에서 **제외** (UI·카운트·로그 모두 비노출):

- frontmatter 없음
- `name` / `description` 누락 또는 비문자열
- Agent Skills `name` 형식 위반 (`A-Z`, `--`, leading/trailing `-` 등)
- `metadata.internal === true` (skills.sh 기본과 동일)
- `disable-model-invocation` 등은 **유효** — import 가능

서버/클라이언트 디버그용으로만 `discover` API 응답에 `_debug.skippedCount` 정도는 허용 (UI 미표시).

### 3.3 단일 Import 파이프라인

```
[소스: GitHub repo | 로컬 folder]
        ↓
  파일 트리 + manifest JSON
        ↓
  discoverSkillsFromTree()  ← packages/core, pure
        ↓
  유효 스킬만 + 라이브러리 매칭 상태
        ↓
  체크박스 UI (그룹: plugin / uncategorized)
        ↓
  batch import
```

GitHub: 서버가 tree fetch → core discovery.  
Folder: 브라우저가 `File[]` → 동일 core discovery (서버 round-trip 불필요).

---

## 4. Key 생성 규칙 (“명사·동사 조합”)

### 4.1 왜 frontmatter `name`이 1순위인가

Agent Skills 생태계에서 `name`은 이미 **의미 단위를 하이픈으로 연결한 slug**다:

- `pdf-processing` (명사-동명사)
- `deploy-to-vercel` (동사-전치사-명사)
- `create-agentsmd` (동사-명사)

즉 “명사/동사를 조합해 키를 만든다”는 요구는 **표준 `name` 필드를 SSOTA `key`로 채택**하는 것으로 충족한다. 별도 NLP 키워드 추출은 v1에 넣지 않는다.

### 4.2 SSOTA 필드 매핑

```text
frontmatter.name (valid)
  → key     = normalizeSkillKey(name)   // spec 정규화만
  → name    = humanizeSkillName(name)   // "frontend-design" → "Frontend Design"

frontmatter.name (invalid — 스킵되므로 import 경로 없음)

fallback (manifest-only edge case, v2)
  → key     = toSkillKey(lastPathSegment)  // transliteration slugify
  → name    = humanizeSkillKey(key)
```

**`normalizeSkillKey`:** 소문자, 연속 `-` 축소, 48자 truncate (org slug와 동일 상한).

**`humanizeSkillName`:** `toCatalogLabel` 스타일 — `frontend-design` → `Frontend Design`. 이미 공백 포함 표시명이면 그대로.

**`toSkillKey` (transliteration):** Custom 작성에서 유저가 **한글/자연어 제목**만 입력할 때 사용 (`SSOTA 개발` → `ssota-gaebal`). `packages/core` `toRouteSlug` / `transliteration` 재사용.

### 4.3 Numeric suffix (`-2`, `-3`)

**오직 org library key 충돌 시**에만 적용 (§5).  
의미 단위 suffix (예: `deploy-vercel` vs `deploy`)는 v1에서 하지 않음 — 잘못된 추론 위험이 큼.

---

## 5. 기존 스킬 구분·처리 로직

### 5.1 스킬 동일성 (Identity)

라이브러리 항목과 import 후보를 비교할 때 **3축**:

| 축 | 필드 | 의미 |
|----|------|------|
| **A. Library key** | `skills.key` | org 내 에이전트 manifest 식별자 |
| **B. Provenance** | `metadata.catalogSource` | `{ source: "owner/repo", skillPath: "skills/foo/SKILL.md" }` (GitHub) 또는 inline `packageHash` (folder) |
| **C. Content** | `contentHash` | SKILL.md + 번들 파일 해시 |

Folder import provenance (v1):

```json
{
  "kind": "custom",
  "packageHash": "<hash>",
  "importOrigin": { "type": "folder", "rootName": "my-skill-pack" }
}
```

GitHub:

```json
{
  "catalogSource": {
    "source": "vercel-labs/agent-skills",
    "sourceType": "github",
    "skillPath": "skills/frontend-design/SKILL.md"
  }
}
```

### 5.2 매칭 상태 머신

각 discovered skill에 대해 org library와 비교해 **단일 상태** 부여:

| 상태 | 조건 | UI 배지 | 기본 체크 | Import 동작 |
|------|------|---------|-----------|-------------|
| `new` | 동일 provenance·key 없음 | — | ☑ | INSERT |
| `imported` | 동일 provenance + 동일 `contentHash` | `In library` | ☐ (disabled) | no-op |
| `update` | 동일 provenance + **다른** `contentHash` | `Update available` | ☑ | UPDATE snapshot + metadata |
| `key_collision` | 다른 provenance, **같은 suggested key** | `Will import as frontend-design-2` | ☑ | INSERT with uniquified key |
| `key_collision_update` | provenance 다름, key 같고 기존이 GitHub·hash 다름 | `Conflicts with …` | ☐ | v1: suffix import only; v2: rename/replace 선택 |

**Provenance 매칭 (GitHub):** `catalogSource.source` + `catalogSource.skillPath` exact match.  
**Provenance 매칭 (folder):** v1은 `packageHash`만으로는 재import 구분 어려움 → **skillPath 상대경로 + root folder name** 조합을 `importOrigin`에 저장 후 비교.

### 5.3 Key uniquify 알고리즘 (서버 SSOT)

```text
function allocateUniqueSkillKey(orgId, preferredKey):
  base = normalizeSkillKey(preferredKey)
  if not exists(orgId, base): return base
  for n in 2..999:
    candidate = `${base}-${n}`
    if not exists(orgId, candidate): return candidate
  throw ORG_SKILL_KEY_EXHAUSTED
```

**중요:** `registerSkill`의 기존 “같은 key면 UPDATE” 동작은 **provenance가 같을 때만** 유지. provenance 없이 key만 같으면 → uniquify 후 INSERT (실수로 덮어쓰기 방지).

### 5.4 Explore / Community / Builtin과의 구분

| 출처 | `skills.organizationId` | library에서의 key |
|------|-------------------------|-------------------|
| Platform builtin | `NULL` | org에 copy 시 community flow (별도) |
| Community explore | platform + `kind: community` | Save to library (기존) |
| Org import | org id | 본 플랜 |

Import UI에서는 **org library `listLibrarySkills`만** 충돌 검사에 사용. Explore 탭 스킬은 “Save” 플로우 유지.

---

## 6. Discovery 알고리즘 (core)

### 6.1 입력

```ts
type DiscoverInput = {
  files: Array<{ path: string; contents?: string }>; // folder: 전체, github: SKILL.md+manifest만 peek 가능
  manifests?: {
    claudeMarketplace?: string;
    claudePlugin?: string;
    cursorPlugin?: string;
  };
};
```

### 6.2 단계

1. **Parse manifests** → explicit `skillPath` 후보 + plugin grouping (`pluginName`)
2. **Scan conventional dirs** — skills.sh README 목록 (§2.2) + root `SKILL.md`
3. **Depth walk** — container당 1–2 depth (`skills/foo/SKILL.md`, `skills/.curated/foo/bar/SKILL.md`)
4. **Dedupe** — frontmatter `name` 기준, 동일 name이면 **더 높은 priority path** 유지
5. **Validate** — §3.2 통과분만 출력
6. **Enrich** — suggested key, display name, library match status (§5)

### 6.3 출력

```ts
type DiscoveredSkill = {
  skillPath: string;           // repo-relative
  frontmatterName: string;
  description: string;
  suggestedKey: string;
  displayName: string;
  pluginName?: string;
  libraryStatus: "new" | "imported" | "update" | "key_collision";
  resolvedKey?: string;        // suffix 적용 후
  existingSkillId?: string;
};
```

Invalid 항목은 **배열에 포함하지 않음**.

---

## 7. UI 플로우

### 7.1 메뉴 구조

```text
Add skill ▾
  ├── Import from GitHub…     → 통합 Import 시트 (source=github)
  ├── Import from folder…     → 통합 Import 시트 (source=folder)
  └── Write custom skill…     → BlockNote 시트 (별도, §7.3)
```

### 7.2 통합 Import 시트

```text
┌─ Import skills ──────────────────────────────────────┐
│ Repository: [ owner/repo          ] [ Discover ]      │  ← GitHub 탭
│ — or —                                                │
│ Folder:     [ Choose folder… ]                        │  ← Folder 탭
│                                                       │
│ Plugin: document-skills (3)                           │
│ ☑ formatter      Format markdown tables…              │
│   skills/formatter/SKILL.md          [In library]   │
│ ☑ review         Review PRs for…                      │
│   skills/review/SKILL.md             [Update avail.]  │
│                                                       │
│ Other (2)                                             │
│ ☐ legacy-skill   …                   [as legacy-2]    │
│                                                       │
│                              [ Import 2 skills ]      │
└───────────────────────────────────────────────────────┘
```

- Invalid 스킬: **행 자체 없음**
- `In library` / `Update available` / `Will import as …` 배지만 표시
- 기본 체크: `new` + `update` + `key_collision` (suffix preview 반영)
- `imported`: 체크 해제 + disabled

### 7.3 Custom 작성 (최소 입력)

| 필드 | 유저 |
|------|------|
| Title (표시용) | ✅ 한 줄 |
| Description | ✅ (textarea) |
| Body | ✅ BlockNote |
| Key | ❌ 자동 (`toSkillKey(title)`) |

---

## 8. API

| Method | Path | 용도 |
|--------|------|------|
| `GET` | `/api/skills/discover/github?repo=&teamspaceId=` | Tree + peek → `DiscoveredSkill[]` |
| `POST` | `/api/skills/discover/folder` | (선택) 대용량; v1은 클라이언트 discovery |
| `POST` | `/api/skills/import` | `{ teamspaceId, items: [{ skillPath, files?, catalogSource? }] }` |

`discover/github`는 라이브러리 목록을 함께 읽어 `libraryStatus` / `resolvedKey`를 계산해 반환.

---

## 9. 구현 PR 순서

| PR | 내용 | 검증 | 상태 |
|----|------|------|------|
| **PR-1** | `packages/core`: manifest parse, conventional paths (skills.sh list), `discoverSkillsFromTree`, key helpers | `pnpm test --filter @ssota/core` | ✅ |
| **PR-2** | Adapter: GitHub tree fetch, `discoverGithubSkills`, provenance-aware `registerSkill` + `allocateUniqueSkillKey` | adapter unit + integration | 🟡 |
| **PR-3** | API: `discover/github`, `import` batch | route tests | ⬜ |
| **PR-4** | UI: 통합 Import 시트, 기존 GitHub/Folder 시트 제거 | E2E folder + github mock | ⬜ |
| **PR-5** | Custom 시트 슬림화 (title + body, key 숨김) | E2E custom | ⬜ |
| **PR-6** | (선택) Cursor marketplace, recursive fallback, Advanced key override | — | ⬜ |

---

## 10. 오픈 질문 (결정 필요)

| # | 질문 | 제안 (v1) |
|---|------|-----------|
| 1 | Folder 재import 시 provenance | `importOrigin: { type, rootName, skillPath }` 저장 |
| 2 | `update` 시 agent binding lock | contentHash 변경 → binding `lockStatus: pending` (기존 refresh 플로우) |
| 3 | Multi-import 부분 실패 | 항목별 `{ ok, skill?, error? }[]` 반환 |
| 4 | Private GitHub repo | v2: org GitHub connection; v1: public + `GITHUB_TOKEN` env |
| 5 | Pi 루트 `.md` 단일 스킬 | v2 |

---

## 11. 참고 링크

- [Agent Skills Specification](https://agentskills.io/specification)
- [skills.sh / vercel-labs/skills](https://github.com/vercel-labs/skills) — conventional paths + plugin manifests
- [Cursor Plugins Reference](https://cursor.com/docs/reference/plugins) — `.cursor-plugin/plugin.json`
- [Cursor Agent Skills](https://cursor.com/docs/skills) — `.agents/skills/`, frontmatter `name` = folder name
- [Codex Skills](https://developers.openai.com/codex/skills) — `.agents/skills/`
- [Pi Skills](https://badlogic-pi-mono.mintlify.app/coding-agent/skills) — `.pi/skills/`, recursive `SKILL.md`
- [Hermes Skills](https://hermes-agent.nousresearch.com/docs/user-guide/features/skills) — `.hermes/skills/`
- [Claude Code Plugin Marketplaces](https://code.claude.com/docs/en/plugin-marketplaces) — `.claude-plugin/*`
- SSOTA: `packages/core/src/skill/frontmatter.ts`, `skills-lock.json`, `plugins/ssota-plugin/.cursor-plugin/plugin.json`

---

## 12. 한 줄 요약

> **레포/폴더 → (Claude/Cursor manifest + skills.sh 경로 스캔) → 유효 SKILL.md만 → frontmatter `name`을 key로, description을 그대로 → 라이브러리 provenance·hash로 상태 구분 → 체크박스로 일괄 import. Invalid는 숨김. Key 충돌만 `-2` suffix.**
