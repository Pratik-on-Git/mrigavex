import { createHmac } from "node:crypto"

// Best-effort client IP. Behind Vercel/most proxies the left-most
// x-forwarded-for entry is the client. Only used for throttling and a hashed
// abuse trail — never for authorization.
export function clientIp(request: Request): string {
    const forwarded = request.headers.get("x-forwarded-for")
    if (forwarded) {
        const first = forwarded.split(",")[0]?.trim()
        if (first) return first.slice(0, 64)
    }
    return (request.headers.get("x-real-ip") || "unknown").slice(0, 64)
}

// Leads keep a keyed hash of the IP, not the IP itself: enough to spot one
// sender flooding the form, without storing personal data in the clear.
export function hashIp(ip: string): string {
    const key = process.env.AUTH_SECRET || "dev-only-key"
    return createHmac("sha256", key).update(ip).digest("hex").slice(0, 32)
}

// CSRF guard for cookie-authenticated mutations. Session cookies are already
// SameSite=Strict; this rejects any request a browser marks as coming from
// another site. Non-browser clients (no Origin, no Sec-Fetch-Site) pass, but
// they don't carry the admin's cookies anyway.
export function isSameOrigin(request: Request): boolean {
    const origin = request.headers.get("origin")
    if (origin) {
        const host = request.headers.get("x-forwarded-host") || request.headers.get("host")
        try {
            return Boolean(host) && new URL(origin).host === host
        } catch {
            return false
        }
    }
    const site = request.headers.get("sec-fetch-site")
    return !site || site === "same-origin" || site === "none"
}
