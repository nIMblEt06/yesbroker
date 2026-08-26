import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function parseVCards(content: string): string[] {
  const blocks = content.split(/BEGIN:VCARD/i).slice(1);
  const lines: string[] = [];
  for (const block of blocks) {
    const telMatch = block.match(/^TEL[^:\n]*:(.+)$/im);
    if (!telMatch) continue;
    const fnMatch = block.match(/^FN:(.*)$/im);
    const name = fnMatch?.[1]?.trim() ?? "";
    const phone = telMatch[1].trim();
    lines.push(`${name} ${phone}`.trim());
  }
  return lines;
}

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const text = form.get("text");
  const title = form.get("title");

  const lines: string[] = [];
  if (typeof text === "string" && text.trim()) lines.push(text.trim());

  for (const entry of form.getAll("contacts")) {
    if (entry instanceof File) {
      lines.push(...parseVCards(await entry.text()));
    }
  }

  if (!lines.length && typeof title === "string" && title.trim()) {
    lines.push(title.trim());
  }

  const dest = new URL("/add", req.url);
  const combined = lines.join("\n").slice(0, 10000);
  if (combined) dest.searchParams.set("text", combined);
  else dest.searchParams.set("shareFailed", "1");

  return NextResponse.redirect(dest, 303);
}
