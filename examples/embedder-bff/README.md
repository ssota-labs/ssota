# Embedder BFF 예시 (고객사 A)

고객사 A의 백엔드가 **자체 Supabase auth/RLS**로 최종 사용자를 검증한 뒤, `@ssota/client`의 `subjectId` 옵션으로 `X-SSOTA-Subject-Id`를 주입하는 최소 BFF 예시입니다.

## 흐름

```
[브라우저] → [A API — A.users auth]
                ↓ X-Embedder-User-Id: usr_acme_42
           [이 BFF :3200]
                ↓ Bearer (SSOTA service) + X-SSOTA-Subject-Id
           [SSOTA HTTP API /api/v1]
```

## 실행

```bash
# SSOTA MCP가 떠 있어야 함 (pnpm dev --filter mcp 또는 e2e webServer)
SSOTA_MCP_URL=http://127.0.0.1:3001 pnpm exec tsx examples/embedder-bff/server.ts
```

## 호출 예시

```bash
curl -s http://127.0.0.1:3200/ssota/execute \
  -H 'Content-Type: application/json' \
  -H 'X-Embedder-User-Id: usr_acme_42' \
  -d '{"actionType":"create_homepage_project","input":{"title":"Acme 2026"}}'
```

BFF는 내부적으로 `smoke@ssota.test`로 SSOTA 토큰을 받고, `createClient({ subjectId: () => requestSubjectId })`로 **embedder가 넘긴 user id**만 subject로 사용합니다.

## 환경변수

| 변수 | 기본값 |
|---|---|
| `EMBEDDER_BFF_PORT` | `3200` |
| `SSOTA_MCP_URL` | `http://127.0.0.1:3001` |
| `SSOTA_SERVICE_EMAIL` | `smoke@ssota.test` |
| `SSOTA_SERVICE_PASSWORD` | `smoke-test-password-123` |

프로덕션에서는 `SSOTA_SERVICE_*`를 고객사 A 전용 SSOTA 서비스 계정으로 교체합니다.
