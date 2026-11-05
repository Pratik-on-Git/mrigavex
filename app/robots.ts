import type { MetadataRoute } from "next"
import { SITE } from "@/lib/site"

// /admin and /auth stay crawlable on purpose so bots can read their noindex
// headers/meta; access control is the proxy + API auth, never robots.txt.
export default function robots(): MetadataRoute.Robots {
    return {
        rules: [{ userAgent: "*", allow: "/", disallow: ["/api/"] }],
        sitemap: `${SITE.url}/sitemap.xml`,
        host: SITE.url,
    }
}
