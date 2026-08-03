// Content-Security-Policy notes:
// - script-src/style-src need 'unsafe-inline': Next.js injects an inline
//   hydration payload <script>, and this app renders styling via React's
//   inline `style={...}` prop everywhere (a custom `s()` CSS-string ->
//   style-object helper, see lib/style.ts) rather than CSS classes/
//   stylesheets — CSP's style-src also governs the `style` HTML
//   attribute, not just <style> blocks, so removing 'unsafe-inline'
//   there would break the whole site's visual styling. A stricter
//   nonce-based CSP would need both a rework of how styling is done and
//   per-request nonce wiring via middleware — out of scope for this pass.
// - img-src allows the Unsplash host the seed catalog's photos come from
//   (see images.remotePatterns below) plus 'self' for admin-uploaded
//   images under /uploads (public/uploads, same-origin) and data: URIs.
// - style-src/font-src allow fonts.googleapis.com/fonts.gstatic.com:
//   app/globals.css @imports the Geist/Geist Mono font family from
//   Google Fonts as a real stylesheet request, not a bundled asset.
// - script-src needs 'unsafe-eval' in development ONLY: `next dev`'s
//   webpack HMR/React Refresh runtime evaluates code via eval() for its
//   source maps. Without this, the CSP silently breaks client-side
//   hydration in dev (confirmed by testing — every page got stuck on
//   its loading state because the whole React tree threw on mount).
//   Production builds (`next build`/`next start`) don't use eval, so
//   'unsafe-eval' is deliberately left out there.
const isDev = process.env.NODE_ENV !== "production";
const CSP = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: https://images.unsplash.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: CSP },
  // 2 years + preload is the usual recommendation, but this hasn't been
  // submitted to the HSTS preload list — start conservative (6 months,
  // no preload) and raise it once HTTPS is confirmed stable in
  // production. Harmless to send over plain HTTP too (browsers ignore
  // it there), so it's safe to leave on in dev.
  { key: "Strict-Transport-Security", value: "max-age=15552000; includeSubDomains" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com" }],
  },
  experimental: {
    serverComponentsExternalPackages: ["pg", "@prisma/adapter-pg"],
  },
  // Standalone output: bundles just the traced production dependencies
  // into .next/standalone, so the Docker image doesn't need the full
  // node_modules tree copied in. See Dockerfile.
  output: "standalone",
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
