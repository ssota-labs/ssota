export const en = {
  common: {
    signIn: "Sign in",
    signOut: "Sign out",
    or: "or",
    save: "Save",
    language: "Language",
  },
  auth: {
    title: "Sign in",
    description:
      "If you don't have an account, signing in with email and password will create one automatically.",
    googleSignIn: "Sign in with Google",
    googleNotEnabled: "Google sign-in is not enabled",
  },
  oauth: {
    consentTitle: "Authorize MCP access",
    consentDescription: "An MCP client is requesting access to SSOTA.",
    clientRequest: "{client} is requesting access to your SSOTA account.",
    signedInAs: "Signed in as",
    permissionsTitle: "This will allow the client to:",
    scopeEmail: "View your email address",
    scopeUnknown: "Access: {scope}",
    approve: "Approve",
    deny: "Deny",
    loading: "Loading authorization details…",
    missingAuthorizationId: "authorization_id is required.",
  },
  nav: {
    projectHome: "Project Home",
    graph: "Graph",
    instruction: "Instruction",
    gates: "Gates",
    actionLog: "Action Log",
    settings: "Settings",
    organization: "Organization",
    project: "Project",
    signedInAs: "Signed in as",
    primary: "Primary",
  },
  breadcrumbs: {
    graph: "Graph",
    nodes: "Nodes",
    edges: "Edges",
    actions: "Actions",
    instructions: "Instructions",
    gates: "Gates",
    log: "Action Log",
    settings: "Settings",
    general: "General",
    verticals: "Verticals",
    homepageAgent: "Homepage Agent",
  },
  gates: {
    title: "Human Gate",
    empty: "No pending gates.",
    approve: "Approve",
    reject: "Reject",
  },
  log: {
    title: "Action Log",
    description:
      "Audit timeline of every executeAction commit, gate, and rejection event.",
    recentActivity: "Recent activity",
    recentDescription:
      "Outcome badges reflect committed, gated, or rejected runtime decisions.",
    time: "Time",
    action: "Action",
    scope: "scope",
    instruction: "instruction",
    outcome: "Outcome",
    executor: "Executor",
  },
  settings: {
    title: "Settings",
    description: "Project and organization configuration.",
    general: "General",
    orgProjectSlugs: "Org slug: {orgSlug} · Project slug: {projectSlug}",
    languageTitle: "Language",
    languageDescription: "Choose the display language for the console UI.",
    languageSaved: "Language preference saved.",
    comingSoon:
      "MCP integration and member management settings will be added in a later milestone.",
    english: "English",
    korean: "Korean",
  },
} as const;

export const ko = {
  common: {
    signIn: "로그인",
    signOut: "로그아웃",
    or: "또는",
    save: "저장",
    language: "언어",
  },
  auth: {
    title: "로그인",
    description: "계정이 없으면 이메일과 비밀번호로 자동 가입됩니다.",
    googleSignIn: "Google로 로그인",
    googleNotEnabled: "Google 로그인이 활성화되지 않았습니다",
  },
  oauth: {
    consentTitle: "OAuth 동의",
    consentDescription: "MCP 클라이언트가 SSOTA에 접근하려 합니다.",
    clientRequest: "{client}가 SSOTA 계정에 접근하려 합니다.",
    signedInAs: "로그인 계정",
    permissionsTitle: "다음 권한을 허용합니다:",
    scopeEmail: "이메일 주소 확인",
    scopeUnknown: "접근 권한: {scope}",
    approve: "승인",
    deny: "거부",
    loading: "인증 정보를 불러오는 중…",
    missingAuthorizationId: "authorization_id가 필요합니다.",
  },
  nav: {
    projectHome: "프로젝트 홈",
    graph: "그래프",
    instruction: "인스트럭션",
    gates: "게이트",
    actionLog: "액션 로그",
    settings: "설정",
    organization: "조직",
    project: "프로젝트",
    signedInAs: "로그인 계정",
    primary: "주요 메뉴",
  },
  breadcrumbs: {
    graph: "그래프",
    nodes: "노드",
    edges: "엣지",
    actions: "액션",
    instructions: "인스트럭션",
    gates: "게이트",
    log: "액션 로그",
    settings: "설정",
    general: "일반",
    verticals: "버티컬",
    homepageAgent: "홈페이지 에이전트",
  },
  gates: {
    title: "Human Gate",
    empty: "대기 중인 게이트가 없습니다.",
    approve: "승인",
    reject: "반려",
  },
  log: {
    title: "Action Log",
    description:
      "모든 executeAction 커밋·게이트·거부 이벤트의 감사 타임라인입니다.",
    recentActivity: "최근 활동",
    recentDescription:
      "결과 배지는 커밋, 게이트, 거부된 런타임 결정을 나타냅니다.",
    time: "시간",
    action: "액션",
    scope: "scope",
    instruction: "instruction",
    outcome: "결과",
    executor: "실행자",
  },
  settings: {
    title: "설정",
    description: "프로젝트 및 조직 구성.",
    general: "일반",
    orgProjectSlugs: "조직 slug: {orgSlug} · 프로젝트 slug: {projectSlug}",
    languageTitle: "언어",
    languageDescription: "콘솔 UI에 표시할 언어를 선택합니다.",
    languageSaved: "언어 설정이 저장되었습니다.",
    comingSoon: "MCP 연동·멤버 관리 설정은 후속 마일스톤에서 추가됩니다.",
    english: "English",
    korean: "한국어",
  },
} satisfies {
  [K in keyof typeof en]: {
    [P in keyof (typeof en)[K]]: string;
  };
};

type Stringify<T> = {
  [K in keyof T]: T[K] extends string ? string : never;
};

export type Messages = {
  [K in keyof typeof en]: Stringify<(typeof en)[K]>;
};
