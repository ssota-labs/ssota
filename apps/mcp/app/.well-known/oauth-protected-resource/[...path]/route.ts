// RFC 9728: 리소스 경로(`/api/mcp`)를 끼워넣은 suffixed well-known 위치.
// 루트 route.ts와 동일한 메타데이터를 반환한다(catch-all로 모든 하위 경로 수용).
export { handleProtectedResource as GET } from "@/lib/mcp/protected-resource";
