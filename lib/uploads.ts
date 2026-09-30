import path from "node:path";

export const UPLOAD_EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export const UPLOAD_MIME_BY_EXT: Record<string, string> = Object.fromEntries(
  Object.entries(UPLOAD_EXT_BY_MIME).map(([mime, ext]) => [ext, mime]),
);

/** Exactly the names /api/upload generates: `<uuid>.<ext>`. */
export const UPLOAD_NAME_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp|gif)$/;

/**
 * Where admin-uploaded images live. Defaults to public/uploads so the dev
 * server keeps serving them as plain static files; point UPLOAD_DIR at a
 * mounted volume in production so uploads survive container rebuilds.
 */
export function uploadsDir(): string {
  return process.env.UPLOAD_DIR || path.join(process.cwd(), "public", "uploads");
}
