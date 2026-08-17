/** Local: no media. CI: keep failure evidence only. */
const ci = Boolean(process.env.CI);

export const playwrightMediaUse = {
  trace: ci ? ("on-first-retry" as const) : ("off" as const),
  screenshot: ci ? ("only-on-failure" as const) : ("off" as const),
  video: ci ? ("retain-on-failure" as const) : ("off" as const),
};
