import { getSiteUrl } from "@/lib/auth/config";
import { getFromEmail, getResendClient } from "./resend-client";

export type OrganizationInviteEmailInput = {
  invitationId: string;
  inviteeEmail: string;
  organizationName: string;
  inviterName: string;
  expiresAt: Date;
  locale: "en" | "ko";
};

type Copy = {
  subject: string;
  greeting: string;
  body: string;
  roleLabel: string;
  expiresLabel: string;
  cta: string;
  fallback: string;
  footer: string;
  team: string;
};

const COPY: Record<"en" | "ko", Copy> = {
  en: {
    subject: "You've been invited to join {org} on SSOTA",
    greeting: "Hello,",
    body: "{inviter} has invited you to join <strong>{org}</strong> as a member.",
    roleLabel: "Role",
    expiresLabel: "Expires",
    cta: "Accept invitation",
    fallback: "If the button doesn't work, copy and paste this link into your browser:",
    footer: "If you weren't expecting this invitation, you can safely ignore this email.",
    team: "The SSOTA team",
  },
  ko: {
    subject: "SSOTA {org} 조직 초대",
    greeting: "안녕하세요,",
    body: "{inviter}님이 <strong>{org}</strong> 조직에 멤버로 초대했습니다.",
    roleLabel: "역할",
    expiresLabel: "만료",
    cta: "초대 수락하기",
    fallback: "버튼이 동작하지 않으면 아래 링크를 브라우저에 붙여넣으세요:",
    footer: "예상하지 못한 초대라면 이 메일을 무시하셔도 됩니다.",
    team: "SSOTA 팀",
  },
};

function formatDate(date: Date, locale: "en" | "ko"): string {
  return date.toLocaleDateString(locale === "ko" ? "ko-KR" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function buildOrganizationInviteEmailHtml(
  input: OrganizationInviteEmailInput,
): string {
  const siteUrl = getSiteUrl();
  const logoUrl = `${siteUrl}/landing/logo.png`;
  const inviteUrl = `${siteUrl}/invite/${input.invitationId}`;
  const copy = COPY[input.locale];
  const subjectOrg = input.organizationName;

  const bodyHtml = copy.body
    .replace("{inviter}", input.inviterName)
    .replace("{org}", input.organizationName);

  return `<!DOCTYPE html>
<html lang="${input.locale}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${copy.subject.replace("{org}", subjectOrg)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f4f4f5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:12px;border:1px solid #e4e4e7;overflow:hidden;">
          <tr>
            <td style="padding:32px 32px 24px;text-align:center;border-bottom:1px solid #f4f4f5;">
              <img src="${logoUrl}" alt="SSOTA" width="120" height="auto" style="display:inline-block;max-width:120px;height:auto;" />
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 16px;font-size:16px;line-height:24px;color:#18181b;">${copy.greeting}</p>
              <p style="margin:0 0 24px;font-size:16px;line-height:24px;color:#3f3f46;">${bodyHtml}</p>
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 24px;width:100%;background:#fafafa;border-radius:8px;">
                <tr>
                  <td style="padding:16px;font-size:14px;line-height:20px;color:#52525b;">
                    <div><strong>${copy.roleLabel}:</strong> Member</div>
                    <div style="margin-top:8px;"><strong>${copy.expiresLabel}:</strong> ${formatDate(input.expiresAt, input.locale)}</div>
                  </td>
                </tr>
              </table>
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 24px;">
                <tr>
                  <td style="border-radius:8px;background:#0891b2;">
                    <a href="${inviteUrl}" style="display:inline-block;padding:12px 24px;font-size:16px;font-weight:600;color:#ffffff;text-decoration:none;">${copy.cta}</a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 8px;font-size:13px;line-height:20px;color:#71717a;">${copy.fallback}</p>
              <p style="margin:0 0 24px;font-size:13px;line-height:20px;color:#0891b2;word-break:break-all;">
                <a href="${inviteUrl}" style="color:#0891b2;">${inviteUrl}</a>
              </p>
              <p style="margin:0 0 8px;font-size:13px;line-height:20px;color:#a1a1aa;">${copy.footer}</p>
              <p style="margin:0;font-size:13px;line-height:20px;color:#a1a1aa;">${copy.team}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendOrganizationInviteEmail(
  input: OrganizationInviteEmailInput,
): Promise<void> {
  const resend = getResendClient();
  if (!resend) return;

  const copy = COPY[input.locale];
  const subject = copy.subject.replace("{org}", input.organizationName);

  await resend.emails.send({
    from: getFromEmail(),
    to: input.inviteeEmail,
    subject,
    html: buildOrganizationInviteEmailHtml(input),
  });
}
