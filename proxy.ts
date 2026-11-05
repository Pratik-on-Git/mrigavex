import { NextResponse, type NextRequest } from "next/server"
import { safeAdminCallback } from "@/lib/safeRedirect"
import { SESSION_COOKIE, sessionCookieOptions, verifySession } from "@/lib/session"

// Next 16 renamed middleware → proxy (Node runtime). This is the OPTIMISTIC
// check: it only verifies the session token's signature and expiry so signed-
// out visitors are redirected before any admin UI renders. It deliberately
// doesn't touch the database (it runs on prefetches too). The authoritative
// check — revocation, account state, ADMIN_EMAIL — is requireAdmin() in
// lib/authentication.ts, called by every admin API route.
export async function proxy(request: NextRequest) {
    const { pathname, search } = request.nextUrl
    const session = await verifySession(request.cookies.get(SESSION_COOKIE)?.value).catch(() => null)

    // /auth/* — already signed in? Go straight to the portal.
    if (pathname.startsWith("/auth")) {
        if (session) {
            const target = safeAdminCallback(request.nextUrl.searchParams.get("callback"))
            return NextResponse.redirect(new URL(target, request.url))
        }
        return NextResponse.next()
    }

    // /admin/* — signed out (or token expired/tampered) → sign in, then return.
    if (!session) {
        const loginUrl = new URL("/auth/login", request.url)
        loginUrl.searchParams.set("callback", safeAdminCallback(pathname + search))
        const res = NextResponse.redirect(loginUrl)
        // Drop a stale/invalid cookie so it isn't re-sent on every request.
        // (__Host- cookies are only cleared with the same Secure/Path attributes.)
        if (request.cookies.has(SESSION_COOKIE)) res.cookies.set(SESSION_COOKIE, "", { ...sessionCookieOptions, maxAge: 0 })
        return res
    }

    return NextResponse.next()
}

export const config = {
    matcher: ["/admin/:path*", "/auth/:path*"],
}
