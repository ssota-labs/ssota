# SSOTA Design System

> SSOT: `packages/ui` + preset `b2CimoD3a` (Base UI / style `base-mira` / theme cyan / font Geist)

## 1. Brand Context

SSOTA는 에이전트에게 결정을 위임하기 위한 컨텍스트 그래프 런타임이다. 콘솔 UI는 Human Gate·Action Log·카탈로그 브라우저를 제공하며, 기술적·신뢰감 있는 SaaS 톤을 유지한다. 장식보다 정보 밀도와 감사 가능성을 우선한다.

## 2. Color System

Semantic tokens (`packages/ui/src/styles/globals.css`):

| Token | 용도 |
|-------|------|
| `background` / `foreground` | 페이지 배경·본문 |
| `primary` / `primary-foreground` | 주요 CTA (승인, 로그인) |
| `secondary` / `muted` | 보조 영역, 테이블 헤더 |
| `destructive` | 반려, 오류 |
| `border` / `input` / `ring` | 테두리·포커스 |
| `accent` | hover, 선택 |

Primary는 cyan 계열 oklch (`--primary: oklch(0.52 0.105 223.128)`). **[DS-01] 임의 hex를 컴포넌트에 직접 쓰지 않는다.**

## 3. Typography

- **Sans**: Geist (`next/font/google`, `--font-sans`)
- **Scale**: `text-xs` ~ `text-3xl`, `font-medium` / `font-semibold` for headings
- **Body**: `text-sm` for dense console tables

## 4. Spacing & Layout

- Console max width: `max-w-6xl`, horizontal padding `px-6`
- Section gap: `space-y-6` / `space-y-8`
- Grid cards: `grid gap-4 md:grid-cols-3`
- Radius: `--radius: 0.625rem` (preset default)

## 5. Component Patterns

| 화면 | 컴포넌트 |
|------|----------|
| Nav / CTA | `Button`, `Link` |
| Dashboard cards | `Card`, `CardHeader`, `CardTitle`, `CardDescription` |
| Gate queue | `Card` + `Button` (approve/reject) |
| Impact queue | `Table`, `Badge` (status), `Sheet` (detail) |
| Action log | `Table`, `Badge` (outcome) |
| Login | `Card`, `Input`, `Button`, `Label` |
| Catalog | `Card`, `Badge` |

Import path: `@ssota/ui/components/ui/<component>`

## 6. Motion

- shadcn `tw-animate-css` + `data-open` / `data-closed` variants
- `prefers-reduced-motion` 존중 (Base UI 기본)

## 7. Do's & Don'ts

**Do**

- `@ssota/ui` semantic tokens 사용 (`bg-background`, `text-muted-foreground`)
- **[DS-03]** Base UI `render` prop으로 trigger/close 구성
- 모든 그래프 쓰기는 core graph use-case + `GraphWritePort` 경유 (UI에서 직접 CRUD 금지, [GRAPH-02])

**Don't**

- Radix `asChild` 패턴 사용 (Base UI 아님) [DS-03]
- **[DS-02]** `neutral-*` / `green-*` 등 raw Tailwind palette를 새 UI에 추가
- 결정 입력을 임의 필드로 깎아내는 폼 UI

## 8. Code Mapping

```
packages/ui/src/styles/globals.css   # @theme + CSS variables
packages/ui/src/components/ui/       # shadcn Base UI components
apps/design-lab/                     # Design Lab catalog (port 6007)
pnpm design-lab                      # dev command
```

CLI (추가 컴포넌트):

```bash
pnpm dlx shadcn@latest add <name> -y -c apps/web
```

## 9. Changelog

- 2026-06-12: Storybook app removed; Design Lab (`apps/design-lab`, port 6007) is the component catalog
- 2026-06-10: preset `b2CimoD3a`, Base UI, `@ssota/ui` monorepo, Storybook, console migration
