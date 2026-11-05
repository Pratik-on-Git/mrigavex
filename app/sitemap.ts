import type { MetadataRoute } from "next"
import { absoluteUrl } from "@/lib/site"
import { WEBSITE_HOME } from "@/routes/WebsiteRoute"

// Public pages only. The site is a single page.
export default function sitemap(): MetadataRoute.Sitemap {
    return [{ url: absoluteUrl(WEBSITE_HOME), changeFrequency: "monthly", priority: 1 }]
}
