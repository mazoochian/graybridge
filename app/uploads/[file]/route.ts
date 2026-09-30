import { NextRequest, NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { UPLOAD_MIME_BY_EXT, UPLOAD_NAME_RE, uploadsDir } from "@/lib/uploads";

export const runtime = "nodejs";

/**
 * Serves admin-uploaded images at /uploads/<file>. `next start` (and the
 * standalone server in Docker) only serves files that were already in
 * public/ at build time, so without this route every image uploaded after
 * deploy would 404. In `next dev`, public/uploads is still served
 * statically and this route is never reached.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  // Strict allow-list of the generated name format, which also rules out
  // path traversal.
  if (!UPLOAD_NAME_RE.test(file)) return new NextResponse("Not found.", { status: 404 });

  try {
    const bytes = await readFile(path.join(uploadsDir(), file));
    const ext = file.slice(file.lastIndexOf(".") + 1);
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": UPLOAD_MIME_BY_EXT[ext],
        // Names are random UUIDs that are never reused, so a URL's content never changes.
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new NextResponse("Not found.", { status: 404 });
  }
}
