/**
 * 로컬 Supabase docker(`supabase start`) 기본 접속 상수.
 *
 * 이 anon key는 시크릿이 아니다 — Supabase CLI가 모든 로컬 스택에 발급하는
 * 공개 데모 토큰(payload `{"iss":"supabase-demo","role":"anon"}`)으로, Supabase
 * 공식 문서에 그대로 실려 있고 배포 환경에는 아무 접근 권한이 없다.
 * (GitGuardian 등 시크릿 스캐너가 JWT 형태 때문에 오탐하는 값이다.)
 *
 * e2e 안에서 이 값이 필요하면 리터럴을 복사하지 말고 여기서 import한다.
 */
export const LOCAL_SUPABASE_URL = "http://127.0.0.1:54321";

export const LOCAL_SUPABASE_DEMO_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
