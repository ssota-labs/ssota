import path from "node:path";
import { compile } from "@tailwindcss/node";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type PreviewUtilitiesBody = {
  classes?: string[];
};

export async function POST(request: Request) {
  let body: PreviewUtilitiesBody;
  try {
    body = (await request.json()) as PreviewUtilitiesBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const classes = Array.isArray(body.classes)
    ? [...new Set(body.classes.filter((value) => typeof value === "string" && value.trim()))]
    : [];

  if (classes.length === 0) {
    return new NextResponse("", {
      headers: { "Content-Type": "text/css; charset=utf-8" },
    });
  }

  const inlineSource = classes
    .map((className) => `"${className.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`)
    .join(", ");

  const input = `
@import "tailwindcss";
@import "@ssota/ui/styles/globals.css";
@source inline(${inlineSource});
`;

  try {
    const result = await compile(input, {
      base: path.join(process.cwd()),
      onDependency: () => {},
    });
    const css = result.build(classes);
    return new NextResponse(css, {
      headers: { "Content-Type": "text/css; charset=utf-8" },
    });
  } catch (error) {
    console.error("preview-utilities compile failed", error);
    return NextResponse.json(
      { error: "Failed to compile preview utilities" },
      { status: 500 },
    );
  }
}
