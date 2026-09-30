import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { getAdminFromRequest } from "@/lib/auth";
import { UPLOAD_EXT_BY_MIME, uploadsDir } from "@/lib/uploads";

export const runtime = "nodejs";

const MAX_BYTES = 8 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File too large (max 8MB)." }, { status: 400 });
  }
  const ext = UPLOAD_EXT_BY_MIME[file.type];
  if (!ext) {
    return NextResponse.json({ error: "Unsupported image type." }, { status: 400 });
  }

  const dir = uploadsDir();
  await mkdir(dir, { recursive: true });

  const filename = `${randomUUID()}.${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, filename), bytes);

  return NextResponse.json({ url: `/uploads/${filename}` }, { status: 201 });
}
