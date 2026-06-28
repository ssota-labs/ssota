# SSOTA Investor Deck — 이미지 assets 가이드

> 덱(`apps/deck`)에서 **사진·스크린샷**을 넣는 방법 SSOT.  
> 텍스트 콘텐츠 SSOT는 [CONTENT.md](./CONTENT.md).

---

## 1. 기본 규칙

| 항목 | 규칙 |
|------|------|
| **저장 위치** | `apps/deck/public/` 아래 (Next.js static files) |
| **코드에서 경로** | `/`로 시작 — `public` 접두사 **없음** (예: `public/team/a.jpg` → `"/team/a.jpg"`) |
| **권장 형식** | `.png` (UI 스크린샷), `.jpg` / `.webp` (사진) |
| **파일명** | 소문자·케밥케이스 권장 (`medai-console.png`) |
| **Git** | 덱 전용 이미지는 저장소에 커밋 가능 (민감·NDA 화면은 제외) |
| **미설정 시** | dashed 플레이스홀더가 표시됨 |

### 권장 폴더 구조

```text
apps/deck/public/
├── team/
│   └── profile.jpg              # 슬라이드 9 — 창업자 프로필
└── traction/
    ├── medai-screenshot.png     # 슬라이드 4 — MedAI 실제 화면
    └── work/                    # 슬라이드 5 — 작업 카드 썸네일 (선택)
        ├── medai.png
        ├── knal.png
        └── ...
```

`public/` 폴더가 없으면 직접 만든다.

---

## 2. 슬라이드별 이미지 슬롯 (전체 9장)

| # | 슬라이드 | 이미지 여부 | 컴포넌트 | 코드 위치 | 연결 방법 |
|---|----------|-------------|----------|-----------|-----------|
| 1 | Title | 없음 | — | — | 로고·배경 이미지 미사용 |
| 2 | Problem | 없음 | `AgentEvolutionRow` | `agent-evolution.tsx` | 아이콘·CSS만 사용 |
| 3 | Solution | 없음 | `SolutionContextFlow` | `solution-context-flow.tsx` | react-flow 다이어그램 (이미지 아님) |
| 4 | Traction ① MedAI | **있음** | `TractionMedAIRow` | `traction.tsx` | `MEDAI_SCREENSHOT_SRC` |
| 5 | Traction ② 트랙레코드 | **있음 (5슬롯)** | `TractionTrackRecord` | `traction.tsx` | `WORK_CARDS[n].imageSrc` |
| 6 | Unique Insight | 없음 | `InsightContrast` | `unique-insight.tsx` | 아이콘만 |
| 7 | Business Model | 없음 | `BusinessModelRow` | `business-model.tsx` | 3티어 카드 + 클라우드 요금표 |
| 8 | Market | 없음 | `MarketRow` | `market.tsx` | TAM/SAM/SOM 퍼널 (텍스트) |
| 9 | Team | **있음** | `TeamFounderRow` | `team.tsx` | `FOUNDER_IMAGE_SRC` |

**현재 이미지를 넣을 수 있는 곳은 3곳** (슬라이드 4, 5, 9).

---

## 3. 슬롯별 추가 방법

### 3.1 슬라이드 4 — MedAI 실제 화면 (큰 스크린샷)

**용도:** PoC 현장 검증 — 우측 절반 전체 스크린샷.

1. 파일 저장:
   ```bash
   # 예시
   apps/deck/public/traction/medai-screenshot.png
   ```
2. `apps/deck/components/traction.tsx` 상단:
   ```typescript
   const MEDAI_SCREENSHOT_SRC: string | undefined = "/traction/medai-screenshot.png";
   ```
3. `undefined`이면 dashed 플레이스홀더 유지.

**권장 비율:** 가로형 UI 캡처 (슬라이드 우측 50% 영역). 높이는 슬라이드에 맞게 `object-cover object-top`으로 크롭됨.

---

### 3.2 슬라이드 5 — 작업 카드 썸네일 (최대 5장)

**용도:** 80건 트랙레코드 하단 프로젝트 카드 상단 미리보기.

1. 파일 저장 (예):
   ```text
   apps/deck/public/traction/work/medai.png
   ```
2. `apps/deck/components/traction.tsx`의 `WORK_CARDS` 배열:
   ```typescript
   const WORK_CARDS: (TrackRecordWorkCard | null)[] = [
     {
       title: "MEDAI 신장암 CT 예측",
       period: "2026",
       summary: "신장종양진단 AI 개발팀 PoC",
       imageSrc: "/traction/work/medai.png",
       tags: ["의료 AI"],
     },
     null, // 빈 슬롯 = dashed 플레이스홀더
     null,
     null,
     null,
   ];
   ```

| 필드 | 필수 | 설명 |
|------|------|------|
| `title` | ✅ | 카드 제목 |
| `imageSrc` | | `/public` 기준 URL 경로 |
| `period` | | 기간 |
| `summary` | | 한 줄 요약 |
| `insight` | | SSOTA 관점 한 줄 |
| `tags` | | 문자열 배열 |

**썸네일 높이:** 카드 상단 72px — 가로로 긴 UI 캡처가 잘 맞음.

---

### 3.3 슬라이드 9 — 창업자 프로필 사진

**용도:** Team 슬라이드 좌측 세로형 프로필.

1. 파일 저장:
   ```bash
   apps/deck/public/team/profile.jpg
   ```
2. `apps/deck/components/team.tsx` 상단:
   ```typescript
   const FOUNDER_IMAGE_SRC: string | undefined = "/team/profile.jpg";
   ```

**권장 비율:** 세로형 인물 사진 (컨테이너 `aspect-[4/5]`). `object-cover object-top` 적용.

---

## 4. 작업 순서 (체크리스트)

```bash
# 1. 덱 dev 서버
pnpm deck                    # http://localhost:6008

# 2. 이미지를 public/ 아래에 저장

# 3. 해당 tsx 상수·배열 경로 수정

# 4. 브라우저 새로고침으로 확인

# 5. PDF 필요 시 (이미지 포함 빌드 후)
pnpm --filter deck build
pnpm --filter deck export:pdf   # → apps/deck/out/ssota-deck.pdf
```

이미지를 바꾼 뒤 PDF를 뽑을 때는 **반드시 `build` 후 `export:pdf`** — dev 서버만 켠 상태의 스크린샷 PDF와 다를 수 있음.

---

## 5. 자주 하는 실수

| 실수 | 올바른 방법 |
|------|-------------|
| `public/team/profile.jpg`를 코드에 그대로 씀 | `"/team/profile.jpg"` (`public` 제외) |
| `apps/web/public`에 저장 | 덱 전용은 **`apps/deck/public`** |
| 경로만 바꾸고 파일 미추가 | `public/` 아래 실제 파일 존재 확인 |
| MedAI는 `WORK_CARDS`로 넣음 | 슬라이드 4 큰 화면은 **`MEDAI_SCREENSHOT_SRC`** |
| 외부 URL만 사용 | 가능하나 오프라인·PDF 재현을 위해 **로컬 `public/` 권장** |

---

## 6. 새 이미지 슬롯을 추가하려면

1. `public/<섹션>/`에 파일 추가
2. 해당 슬라이드 컴포넌트에 `*_IMAGE_SRC` 상수 또는 데이터 필드 추가
3. `<img src={...}>` 또는 조건부 플레이스홀더 패턴 (`team.tsx` · `traction.tsx` 참고)
4. 이 문서 **§2 표**와 **§3**에 슬롯 한 줄 추가

---

## 7. 빠른 참조 — 상수·배열 위치

| 상수 / 데이터 | 파일 |
|---------------|------|
| `MEDAI_SCREENSHOT_SRC` | `components/traction.tsx` |
| `WORK_CARDS` | `components/traction.tsx` |
| `FOUNDER_IMAGE_SRC` | `components/team.tsx` |
