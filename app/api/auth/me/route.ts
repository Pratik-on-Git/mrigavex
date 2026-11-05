import { requireAdmin } from "@/lib/authentication"
import { catchError, response } from "@/lib/helperFunction"

// Who is signed in — used by the admin shell and settings page.
export async function GET(request: Request) {
    try {
        const guard = await requireAdmin(request)
        if (!guard.ok) return guard.res

        const { email, name, lastLoginAt, passwordChangedAt } = guard.admin
        return response(true, 200, "Signed in.", { email, name, lastLoginAt, passwordChangedAt }, {
            headers: { "Cache-Control": "private, no-store" },
        })
    } catch (error) {
        return catchError(error)
    }
}
