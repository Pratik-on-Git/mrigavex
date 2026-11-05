import type { NextConfig } from "next"

const isDev = process.env.NODE_ENV !== "production"

// Content-Security-Policy for a site with no third-party scripts yet.
// 'unsafe-inline' is required for Next's inline bootstrap scripts; dev also
// needs 'unsafe-eval' (React refresh) and a websocket for HMR. When embeds
// (YouTube, Behance…) are added to the public pages, add their hosts to
// frame-src / img-src here.
const contentSecurityPolicy = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
    `connect-src 'self'${isDev ? " ws: wss:" : ""}`,
    "frame-src 'none'",
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ")

const securityHeaders = [
    { key: "Content-Security-Policy", value: contentSecurityPolicy },
    { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
]

// The admin portal and its sign-in page must never be indexed. The header
// also covers redirects and client-rendered pages; layouts repeat it as meta.
const privatePageHeaders = ["/admin/:path*", "/auth/:path*"].map((source) => ({
    source,
    headers: [
        { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
        { key: "Cache-Control", value: "private, no-store" },
    ],
}))

const nextConfig: NextConfig = {
    cacheComponents: true,
    partialPrefetching: true,
    poweredByHeader: false,
    // Allow an isolated build while `next dev` is running (see CLAUDE.md).
    distDir: process.env.NEXT_DIST_DIR || ".next",
    turbopack: {
        rules: {
            "*.css": {
                loaders: ["@tailwindcss/turbopack"],
                as: "*.css",
            },
        },
    },
    async headers() {
        return [
            { source: "/:path*", headers: securityHeaders },
            ...privatePageHeaders,
        ]
    },
    async redirects() {
        return [
            { source: "/admin", destination: "/admin/dashboard", permanent: false },
            { source: "/auth", destination: "/auth/login", permanent: false },
        ]
    },
}

export default nextConfig
