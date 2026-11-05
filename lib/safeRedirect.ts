// Post-login redirect targets come from the URL (?callback=…), so they are
// attacker-controlled. Only same-origin admin paths are accepted; anything
// else (absolute URLs, protocol-relative "//evil.com", backslash tricks,
// encoded control characters, non-admin paths) falls back to the dashboard.
//
// Pure module: used by proxy.ts, the login page and unit tests.

export const ADMIN_HOME = "/admin/dashboard"

export function safeAdminCallback(raw: unknown, fallback: string = ADMIN_HOME): string {
    if (typeof raw !== "string" || raw.length === 0 || raw.length > 512) return fallback

    const value = raw.trim()
    // Checks run on both the raw and the once-decoded form, so "/%2F%2Fevil.com"
    // or "/%5Cevil.com" can't sneak a protocol-relative URL past the router.
    // The raw value is what gets returned, so encoded query values (?q=a%26b)
    // keep their meaning.
    let decoded: string
    try {
        decoded = decodeURIComponent(value)
    } catch {
        return fallback
    }

    for (const candidate of [value, decoded]) {
        if (!candidate.startsWith("/") || candidate.startsWith("//")) return fallback
        if (/[\\\u0000-\u001f\u007f]/.test(candidate)) return fallback
    }
    if (/%2f|%5c/i.test(decoded)) return fallback

    // Resolve against a dummy origin: if the result leaves that origin, the
    // input was not a plain path.
    let url: URL
    try {
        url = new URL(value, "http://internal.invalid")
    } catch {
        return fallback
    }
    if (url.origin !== "http://internal.invalid") return fallback

    const path = url.pathname
    if (path !== "/admin" && !path.startsWith("/admin/")) return fallback

    return `${path}${url.search}${url.hash}`
}
