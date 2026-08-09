import type { MetadataRoute } from "next";

const SITE_URL = process.env.SITE_URL || "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // /cart and /checkout are per-session/transactional, not content;
      // /account is behind auth; /admin definitely shouldn't be crawled.
      disallow: ["/admin", "/account", "/api", "/cart", "/checkout"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
