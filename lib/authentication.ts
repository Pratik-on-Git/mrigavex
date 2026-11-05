import "server-only"
import { cookies } from "next/headers"
import { connection } from "next/server"
import { connectDB } from "@/lib/databaseConnection"
import { response } from "@/lib/helperFunction"
import { isSameOrigin } from "@/lib/request"
import { SESSION_COOKIE, verifySession } from "@/lib/session"
import AdminModel from "@/models/Admin.model"

// Data Access Layer for the admin portal. proxy.ts only does an optimistic,
// signature-only check for fast redirects; THIS is the real authorization,
// called by every admin API route close to the data. It re-validates against
// the database so revoked sessions (sessionVersion bump), a deleted account or
// a changed ADMIN_EMAIL take effect immediately.

export type CurrentAdmin = {
    id: string
    email: string
    name: string
    lastLoginAt: Date | null
    passwordChangedAt: Date | null
    sessionVersion: number
}

export function configuredAdminEmail(): string | null {
    const email = process.env.ADMIN_EMAIL?.trim().toLowerCase()
    return email || null
}

export async function getCurrentAdmin(): Promise<CurrentAdmin | null> {
    // Outside the try: under Cache Components a prerender pass makes cookies()
    // reject on purpose to mark the route as request-time. Swallowing that
    // signal would let a "signed out" result be treated as static output.
    const token = (await cookies()).get(SESSION_COOKIE)?.value
    try {
        const claims = await verifySession(token)
        if (!claims || !/^[a-f0-9]{24}$/i.test(claims.sub)) return null

        const allowedEmail = configuredAdminEmail()
        if (!allowedEmail) return null

        await connectDB()
        const admin = await AdminModel.findById(claims.sub)
            .select("email name sessionVersion lastLoginAt passwordChangedAt")
            .lean()

        if (!admin) return null
        if (admin.email !== allowedEmail) return null
        if ((admin.sessionVersion ?? 1) !== claims.ver) return null

        return {
            id: String(admin._id),
            email: admin.email,
            name: admin.name ?? "",
            lastLoginAt: admin.lastLoginAt ?? null,
            passwordChangedAt: admin.passwordChangedAt ?? null,
            sessionVersion: admin.sessionVersion ?? 1,
        }
    } catch (error) {
        console.error("[auth] session check failed", (error as Error)?.message)
        return null
    }
}

type Guard =
    | { ok: true; admin: CurrentAdmin }
    | { ok: false; res: ReturnType<typeof response> }

// Use at the top of every admin route:
//   const guard = await requireAdmin(request); if (!guard.ok) return guard.res
// Mutating methods also get a same-origin (CSRF) check.
export async function requireAdmin(request: Request): Promise<Guard> {
    // Admin responses are per-request, never prerendered or cached.
    await connection()
    const method = request.method.toUpperCase()
    if (method !== "GET" && method !== "HEAD" && !isSameOrigin(request)) {
        return { ok: false, res: response(false, 403, "Request blocked.") }
    }

    const admin = await getCurrentAdmin()
    if (!admin) {
        return { ok: false, res: response(false, 401, "Your session has ended. Please sign in again.") }
    }
    return { ok: true, admin }
}
