# Studio Seed Platform memo

> 상태: draft · 2026-07-07  
> 목적: 지금까지 논의한 "Studio Seed" 카테고리, 차별점, 도메인 후보, 보호/유통 방식,
> 그리고 CLI-first에서 자체 플랫폼 에이전트까지 가는 로드맵을 한 문서로 정리한다.

## 1. 한 줄 정의

**Studio Seed**는 특정 목적의 인터랙티브 스튜디오 앱을 만들기 위한
**템플릿 코드 + UX 런타임 + 에이전트 스킬 + 검증 계약 + 배포/등록 인터페이스** 묶음이다.

일반 템플릿은 코드 골격만 준다. 일반 스킬은 에이전트 지침만 준다. Studio Seed는 둘을
묶어서, Cursor·Claude Code 같은 코딩 에이전트가 목적별 스튜디오를 안정적으로 "발아"시킬
수 있는 시작점을 제공한다.

```text
Studio Seed
├─ template code       # Vite/React 등 실제 앱 골격
├─ studio runtime      # canvas, panels, controls, export, preview shell
├─ agent skills        # 만들 때 따라야 할 지침, 금지 사항, 디버깅 절차
├─ verification        # acceptance, browser, performance checks
├─ publish contract    # MCP/CLI를 통한 metadata, artifact, deploy 등록
└─ license/entitlement # 구매/권한/업데이트/유통 경계
```

## 2. 왜 유효한가

### 2.1 노코드만으로 부족한 지점

노코드 툴은 반복되는 블록과 정해진 파라미터 조합에는 강하다. 하지만 우리가 말하는
스튜디오 도메인은 다음 특성이 있다.

- 캔버스, WebGL, Canvas 2D, WebGPU, simulation, data visualization처럼 출력 자체가
  동적이고 조작 가능해야 한다.
- 컨트롤 패널과 캔버스 사이의 매핑 로직이 매번 달라진다.
- shader, pixel art, generative visual, 회로 시뮬레이션, 물리 교보재, 투자 분석 같은
  영역은 "블록을 조합"하는 순간 표현력이 급격히 닫힌다.
- 사용자는 값을 조정하고 싶지만, 실제로 원하는 것은 고정된 노브가 아니라 새로운 상상력을
  담는 작은 도구다.
- 코딩 에이전트 비용이 낮아질수록, 범용 노코드 UX보다 목적별 코드 생성이 더 자연스러워진다.

따라서 Studio Seed의 핵심 논리는:

> 완성된 범용 툴을 주는 것이 아니라, 특정 상상력을 다룰 수 있는 작은 툴을 에이전트가
> 빠르게 만들 수 있게 하는 것이다.

### 2.2 스킬만으로 부족한 지점

스킬은 복사 가능하고, 스킬 파일 자체로는 과금 명분이 약하다. Studio Seed는 스킬을
다음 요소와 함께 묶어야 한다.

- 실제 실행 가능한 템플릿 앱
- 에이전트가 임의로 망가뜨리지 못하게 하는 로컬 계약
- 브라우저/성능 검증 루프
- 구매자만 받을 수 있는 seed registry
- MCP/CLI 기반 publish, deploy, library 등록
- 업데이트, 도메인별 premium seed, 팀/클라이언트 handoff

스킬은 제품의 전부가 아니라, Studio Seed를 키우는 "작업 방식"의 일부다.

## 3. 비교 대상과 차별점

| 비교 대상 | 하는 일 | Studio Seed와의 차이 |
|---|---|---|
| Toolcraft | creative tool 생성을 위한 CLI, runtime, UI library, AI instructions, verification | 가장 가까운 선행 사례. 다만 일반 creative design tool 중심이며, seed registry/publish/deploy 플랫폼은 아님 |
| Claude Design | design system/codebase 기반 interactive prototype 생성, canvas editing, Claude Code handoff | 디자인 생성/캔버스 제품. repo-local seed 유통/도메인별 스튜디오 패키지와는 다름 |
| Refract | shader/3D scene을 GUI와 AI/MCP로 만들고 embed export | 특정 visual scene SaaS. 사용자의 repo에 목적별 스튜디오 앱을 발아시키는 모델은 아님 |
| Vercel Platform Template | sandbox, AI Gateway, agent, preview, deploy, project transfer를 갖춘 AI app builder 레퍼런스 | 자체 에이전트 운영 플랫폼. 초기 Studio Seed는 비싼 에이전트 운영을 Cursor/Claude Code에 위임 |
| AgentPowers / sklz.city류 | paid skill marketplace, MCP runtime, CLI login, marketplace distribution | skill 유통/실행 플랫폼. 앱 템플릿과 스튜디오 산출물 관리가 핵심은 아님 |
| OpenPencil | AI-native design editor, CLI, MCP, SDK, Figma-like programmable editor | 디자인 에디터 자체. 목적별 스튜디오 seed 카테고리와는 출발점이 다름 |

핵심 차별점:

> Studio Seed Platform은 AI app builder도 아니고, 디자인 SaaS도 아니고, 단순 스킬 마켓도 아니다.
> 목적별 스튜디오를 설치하고, 기존 코딩 에이전트로 키우고, 우리 플랫폼에 등록/공유/배포하는
> distribution layer다.

## 4. 제품 구성 요소

### 4.1 Seed Registry

- seed 목록, 버전, 권한, 가격, changelog 관리
- public/free seed와 paid/private seed 분리
- domain seed 예: `visual-studio`, `physics-lab`, `circuit-lab`, `investment-workbench`
- 구매/권한 확인 후 CLI가 필요한 템플릿과 스킬을 내려받음

### 4.2 CLI

초기 제품의 주 인터페이스다.

```bash
mirror login
mirror seeds list
mirror create visual-studio my-brand-effect
mirror create physics-lab wave-simulator
mirror publish
mirror deploy
```

CLI가 담당하는 일:

- 로그인/라이선스 확인
- seed 선택
- Vite/React repo 생성
- Cursor/Claude/Codex용 스킬 설치
- MCP 설정 생성
- 검증 명령과 AGENTS.md 계약 설치
- publish/deploy 시 서버와 통신

### 4.3 Agent Skills

에이전트가 지켜야 할 작업 계약이다.

- 어떤 파일을 먼저 읽어야 하는지
- 어떤 렌더링 기술을 선택해야 하는지
- 캔버스에는 product output만 넣어야 한다는 규칙
- built-in controls 우선 규칙
- acceptance/performance/browser verification 규칙
- 도메인별 금지 사항과 필수 증거

초기에는 지적 능력을 Cursor/Claude Code에 위임한다. 우리는 좋은 시작점과 작업 계약만 제공한다.

### 4.4 Studio Runtime

각 seed가 제공하는 기본 앱 구조다.

- canvas/workbench shell
- control panel
- layers/timeline/presets/export는 도메인별 옵션
- file upload/import
- export: PNG, video, SVG, JSON, CSV, report 등 도메인별 산출물
- performance-aware renderer 선택 가이드

### 4.5 Verification Harness

Studio Seed가 단순 데모가 아니라 실제 도구가 되려면, 보이는 것이 실제로 동작해야 한다.

- visible control마다 acceptance row
- 브라우저에서 실제 조작
- 출력 픽셀, canvas hash, export bytes, simulation result, chart output 등 도메인별 증거
- performance budget
- 에이전트 worklog

### 4.6 MCP Publish/Deploy

MCP는 "지능"이 아니라 우리 플랫폼과 연결되는 출판/관리 인터페이스다.

예상 tools:

- `list_studio_seeds`
- `get_seed_instructions`
- `create_studio_record`
- `sync_studio_metadata`
- `upload_preview_assets`
- `publish_studio_build`
- `create_deployment`
- `list_user_studios`

Cursor/Claude Code는 로컬에서 만들고, MCP는 Mirror Dimension에 등록/공유/배포한다.

## 5. 보호와 과금

다운로드된 스킬/템플릿은 완전히 보호할 수 없다. 따라서 보호 전략은 "복사 방지"가 아니라
"계속 업데이트되는 seed registry와 publish/deploy 권한"에 둔다.

### 5.1 가능한 보호 계층

1. **CLI login + entitlement**
   - 구매자만 seed 다운로드
   - 계정별 license/seat 관리

2. **Private npm 또는 private registry**
   - 접근 제어 가능
   - 단, 받은 사람의 복제는 완전히 막지 못함

3. **Thin local CLI + remote seed planner**
   - 로컬에는 실행기와 scaffold만 둔다
   - premium seed resolution, 도메인 spec generation, 최신 검증 계약은 서버에서 내려줌

4. **Hosted skill / remote execution**
   - 핵심 생성 로직을 서버에서 실행
   - 초기에는 무겁지만, 고가 seed나 enterprise seed에는 적합

5. **Platform deploy 권한**
   - seed output은 어디든 배포 가능하지만, Mirror subdomain, gallery, custom domain,
     version history, client handoff는 플랫폼 권한으로 묶을 수 있음

### 5.2 과금 포인트

- seed pack one-time purchase
- monthly seed library subscription
- premium vertical seed
- team/private seed
- hosted preview/deploy
- custom domain
- version history
- client handoff page
- enterprise license for internal seed registry

## 6. 유효한 도메인 후보

좋은 도메인은 다음 조건을 만족한다.

- 캔버스/시뮬레이션/데이터 탐색이 중요하다.
- 사용자가 파라미터를 직접 조작하고 싶어 한다.
- 범용 노코드 툴로는 표현력이 부족하다.
- 매번 비슷하지만 완전히 같지는 않은 툴이 필요하다.
- 결과물이 URL, embed, 이미지, 영상, 리포트, 데이터 파일 등으로 공유 가능하다.

### 6.1 Interactive Visual Studio

예:

- shader generator
- pixel art studio
- halftone/glitch/ASCII image effect
- generative background
- branded asset generator
- WebGL/Three.js scene controller

장점:

- 데모가 강하다.
- 디자이너/크리에이티브 엔지니어에게 직관적이다.
- Toolcraft가 이미 수요와 방법론을 보여줬다.

주의:

- Toolcraft와 정면으로 겹치면 차별화가 약하다.
- 일반 creative tool보다 더 구체적인 vertical이나 distribution layer가 필요하다.

### 6.2 Education Interactive Lab

예:

- 파동/간섭 시뮬레이터
- 전자기장/벡터장 시각화
- 선형대수 변환 시각화
- 미적분/최적화 인터랙티브 교보재
- 물리 엔진 기반 운동학 실험

장점:

- "교사가 직접 만드는 PhET-like mini lab"으로 설명 가능하다.
- WebGL/canvas가 자연스럽다.
- 단순 문서/슬라이드보다 훨씬 강한 산출물이 된다.

주의:

- 정확성 검증이 필요하다.
- 도메인별 기준 답안/수치 검증기가 필요하다.

### 6.3 Circuit / Engineering Lab

예:

- 2D 회로도 + 3D 보드 뷰
- 간단한 SPICE-like 시뮬레이션 설정
- 로직 게이트 학습 도구
- 센서/마이크로컨트롤러 인터랙티브 설명 도구

장점:

- 시각화와 조작 니즈가 강하다.
- 교육, 하드웨어 prototyping, 문서화에 응용 가능하다.

주의:

- 실제 전기 시뮬레이션은 정확도 리스크가 크다.
- 첫 MVP는 "교육용 회로 시각화"로 낮추고, 실제 해석은 기존 엔진에 붙이는 것이 안전하다.

### 6.4 Investment / Research Workbench

예:

- 기업분석 대시보드
- 산업 밸류체인 맵
- 재무제표 분석
- 차트 분석
- 전략 백테스팅
- 리서치 memo + chart + scenario builder

장점:

- 돈을 낼 수 있는 사용자군이 있다.
- 반복되는 분석 프레임워크를 개인화된 workbench로 만들 수 있다.

주의:

- 데이터 라이선스, 정확성, 투자 조언 리스크가 있다.
- "자동 투자 판단"이 아니라 "내 분석 프레임워크를 조작 가능한 스튜디오로 만든다"로 제한해야 한다.

### 6.5 Scientific / Engineering Notebook Studio

예:

- Jupyter보다 시각적이고, Figma보다 계산 가능한 실험 노트
- simulation + explanation + exportable figure
- 논문/강의/기술 블로그용 interactive diagram

장점:

- 장기적으로 강한 카테고리다.
- 도메인 지식과 인터랙티브 UI가 결합된다.

주의:

- 초기 타겟이 넓어질 위험이 있다.
- seed를 작게 나누어야 한다.

### 6.6 Weak domains

초기 seed로 약한 영역:

- 일반 랜딩페이지 빌더
- CRUD admin UI
- 단순 대시보드
- 일반 Figma 와이어프레임 대체
- 일반 "AI로 앱 만들기"

여기는 Claude Design, Lovable, Replit, V0, Framer, generic AI app builders와 너무 정면충돌한다.

## 7. 로드맵

요청한 순서대로 정리하면 다음과 같다.

### Phase 1 — CLI + 기존 코딩 에이전트

목표:

- 우리 에이전트를 직접 운영하지 않는다.
- Cursor, Claude Code, Codex가 코딩 지능을 담당한다.
- 우리는 seed, 템플릿, 스킬, 검증 계약, publish endpoint만 제공한다.

제품:

```bash
mirror login
mirror create visual-studio my-tool
```

범위:

- seed registry v0
- CLI login/entitlement
- seed scaffold
- agent skill install
- local verification commands
- MCP `publish_studio_metadata`
- 유저가 직접 Vercel/Netlify/Cloudflare에 배포한 URL 등록

성공 기준:

- seed 하나로 실제 유저가 목적별 스튜디오를 만든다.
- 일반 프롬프트보다 완성도와 핑퐁 비용이 줄어든다.
- "다른 seed도 있었으면 좋겠다"는 요청이 생긴다.

### Phase 2 — 도메인 여러 개를 각각 운영

목표:

- 하나의 추상 플랫폼으로 서두르지 않는다.
- 서로 다른 vertical seed를 별도 패키지처럼 검증한다.

예:

```bash
npx @mirror/visual-studio-seed create
npx @mirror/physics-lab-seed create
npx @mirror/investment-workbench-seed create
```

각 seed는 자체적으로 가진다:

- 템플릿
- 도메인 지침
- 도메인 검증기
- 예제 앱
- browser/performance acceptance
- 가격/라이선스

성공 기준:

- 한 도메인에서만 통하는 착각을 줄인다.
- 공통 부분과 도메인별 부분이 실제로 분리되는지 확인한다.
- 어떤 도메인이 가장 강한지 시장에서 확인한다.

### Phase 3 — 하나의 CLI로 합치기

목표:

- seed가 3개 이상 반복되면 공통 CLI/registry로 합친다.
- 도메인별 seed는 plugin처럼 유지한다.

제품:

```bash
mirror seeds list
mirror create visual-studio
mirror create physics-lab
mirror create investment-workbench
mirror update
mirror publish
```

범위:

- unified seed registry
- versioning
- seed update
- buyer entitlement
- project metadata sync
- local project identity
- optional deploy adapter
- workspace/library dashboard

성공 기준:

- CLI 하나로 여러 seed를 설치/업데이트/등록할 수 있다.
- 유저가 만든 스튜디오가 Mirror library에 모인다.
- seed별 구매/업데이트/지원이 가능하다.

### Phase 4 — 플랫폼에서 코딩 에이전트 대체

목표:

- Cursor/Claude Code 의존을 줄이고, Mirror 플랫폼 안에서 직접 스튜디오를 생성/수정한다.
- 이 단계부터는 Claude Code 대체 또는 보완이 된다.

제품:

- 웹에서 seed 선택
- 플랫폼 sandbox 생성
- 자체 agent가 코드 수정
- iframe preview
- logs/file explorer
- deploy to Mirror subdomain
- Vercel project transfer 또는 custom domain

가능한 기반:

- Vercel Sandbox
- AI Gateway
- Vercel SDK deployments
- project claim/transfer flow
- 자체 orchestration

주의:

- 이 단계는 비용과 복잡도가 크다.
- 초기에는 하지 않는다.
- Phase 1-3에서 어떤 seed가 돈이 되는지 확인한 뒤에만 진입한다.

성공 기준:

- 사용자가 Cursor/Claude Code 없이도 seed에서 스튜디오를 만들 수 있다.
- 플랫폼이 코딩 비용을 감당할 만큼 결제 의사가 확인된다.
- preview/deploy/version/history가 유료 가치를 만든다.

### Phase 5 — 여러 도메인을 하나로 모은 Studio Seed Platform

목표:

- 가장 마지막 단계다.
- 도메인별 seed가 충분히 검증된 뒤, 하나의 marketplace/library/platform으로 통합한다.

제품:

- seed marketplace
- user studio library
- team/private seed registry
- hosted deployments
- custom domains
- client handoff
- generated studio version history
- seed author ecosystem
- domain packs

이 단계의 포지셔닝:

> Mirror Dimension is a Studio Seed Platform: install a seed, grow it with your
> coding agent, or let the platform agent grow it for you, then publish it to your
> studio library.

## 8. 초기 실행 제안

첫 실험은 플랫폼이 아니라 seed다.

권장 순서:

1. **첫 vertical seed 하나 선택**
   - `interactive-visual-studio`는 데모가 좋지만 Toolcraft와 겹친다.
   - 차별화를 원하면 `education-physics-lab` 또는 `investment-workbench`가 더 낫다.

2. **CLI 없이도 수동으로 seed repo 1개를 만든다**
   - 템플릿 앱
   - AGENTS.md
   - 스킬
   - 검증 명령
   - 예제 1개

3. **실제 사용자 5명에게 one-off로 만들어준다**
   - "이 seed로 네가 원하는 스튜디오를 만들어줄게"
   - 결과물을 실제로 쓰고 싶은지 본다.

4. **반복되는 부분만 CLI화한다**

5. **등록/공유 니즈가 보이면 MCP publish를 붙인다**

## 9. 열려 있는 질문

- 첫 seed는 visual인가, education인가, investment인가?
- seed를 무료로 풀고 publish/deploy만 과금할 것인가, seed 자체를 유료화할 것인가?
- seed source를 얼마나 공개할 것인가?
- Toolcraft와 겹치는 creative tooling을 피할 것인가, 아니면 더 vertical하게 들어갈 것인가?
- 플랫폼 에이전트 운영 비용을 감당할 결제 의사는 어느 도메인에서 가장 먼저 확인되는가?
- 도메인별 검증기는 어느 수준까지 직접 만들고, 어느 수준부터 유저/에이전트에게 맡길 것인가?

## 10. 결론

Studio Seed는 "AI app builder"보다 작고, "agent skill"보다 크다. 초기에는 코딩 에이전트의
지능을 빌리고, 우리는 좋은 seed와 검증 가능한 작업 환경을 판다. 여러 도메인에서 반복성이
확인되면 하나의 CLI로 합치고, 마지막 단계에서만 플랫폼이 자체 코딩 에이전트를 운영한다.

이 순서가 중요한 이유는 단순하다. 처음부터 플랫폼을 만들면 비용이 너무 크고, 스킬만 팔면
방어력이 약하다. Studio Seed는 그 사이에서 수요를 검증하고, 유료 플랫폼으로 갈 수 있는
작은 시작점이다.
