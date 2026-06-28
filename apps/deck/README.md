# deck — SSOTA Investor Deck

`@ssota/ui` 디자인 시스템과 실제 제품 화면 mockup(콘솔/의사결정 그래프/태스크/채팅·MCP)을
그대로 재사용한 React 기반 프레젠테이션. YC 피치덱 스타일 17 슬라이드, 16:9.

## 개발

```bash
pnpm --filter deck dev      # http://127.0.0.1:6008
```

- `←` / `→` (Space, PageUp/Down) 슬라이드 이동, `Home`/`End`
- 좌/우 화면 클릭으로 이동, 우상단 PDF 버튼 → `/print`

## PDF 추출

```bash
pnpm --filter deck build
pnpm --filter deck exec playwright install chromium   # 최초 1회 (이미 e2e 로 설치돼 있으면 생략)
pnpm --filter deck export:pdf                         # → apps/deck/out/ssota-deck.pdf
```

`/print` 라우트는 전 슬라이드를 1280×720 페이지 단위로 쌓는다. 추출 스크립트는 빌드된 앱을
`next start` 로 띄워(또는 `DECK_URL` 로 지정한 서버를 사용해) Chromium PDF 로 저장한다.

## 구조

| 파일 | 역할 |
|---|---|
| `components/slide.tsx` | 16:9 슬라이드 프레임 + 타이포 헬퍼 (토큰 기반) |
| `components/mockups.tsx` | 실제 `@ssota/ui` 컴포넌트로 만든 제품 화면 (BrowserFrame 등) |
| `components/slides.tsx` | 17 슬라이드 콘텐츠 + `buildSlides()` |
| `components/deck.tsx` | 인터랙티브 셸(`Deck`) · 인쇄 셸(`PrintDeck`) |
| `app/page.tsx` · `app/print/page.tsx` | 발표용 / 추출용 라우트 |
