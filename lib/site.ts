// Site identity — the single place to change the name, tagline and links.

const rawUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"

export const SITE = {
    name: "MRIGAVEX",
    title: "MRIGAVEX — Technology. Transformation. Advisory.",
    // Public contact address, from the design.
    email: "contact@velantis-tech.com",
    description: "Independent senior advisory across AI strategy, financial transformation and responsible venture growth.",
    url: rawUrl.replace(/\/+$/, ""),
    locale: "en_NL",
} as const

export const absoluteUrl = (path = "/") => `${SITE.url}${path.startsWith("/") ? path : `/${path}`}`
