import { betaSignupRequestSchema } from "@ssota/contracts";
import { createBetaSignupPort, createDb } from "@ssota/adapter-postgres";
import { Resend } from "resend";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

async function sendBetaConfirmationEmail(email: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return;
  }

  const from =
    process.env.RESEND_FROM_EMAIL ?? "SSOTA <onboarding@resend.dev>";
  const resend = new Resend(apiKey);

  await resend.emails.send({
    from,
    to: email,
    subject: "SSOTA 베타 알림 신청이 완료되었습니다",
    html: `
      <p>안녕하세요,</p>
      <p>SSOTA 베타 오픈 알림 신청이 정상적으로 접수되었습니다.</p>
      <p>7월 중 서비스가 오픈되면 가장 먼저 안내드리겠습니다.</p>
      <p>감사합니다.<br/>SSOTA 팀</p>
    `,
  });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "요청 형식이 올바르지 않습니다." },
      { status: 400 },
    );
  }

  const parsed = betaSignupRequestSchema.safeParse(body);
  if (!parsed.success) {
    const message =
      parsed.error.flatten().fieldErrors.email?.[0] ??
      "입력값을 확인해 주세요.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const { db } = createDb(process.env.DATABASE_URL);
  const port = createBetaSignupPort(db);

  try {
    const { record, created } = await port.upsertByEmail({
      email: parsed.data.email,
      source: "landing",
    });

    if (created) {
      try {
        await sendBetaConfirmationEmail(record.email);
      } catch (error) {
        console.error("[beta-signup] Resend failed:", error);
      }
    }

    return NextResponse.json({
      ok: true,
      created,
      message: created
        ? "베타 알림 신청이 완료되었습니다."
        : "이미 등록된 이메일입니다. 오픈 시 안내드리겠습니다.",
    });
  } catch (error) {
    console.error("[beta-signup] DB failed:", error);
    return NextResponse.json(
      { error: "신청 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 500 },
    );
  }
}
