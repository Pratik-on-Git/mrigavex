import { requireAdmin } from "@/lib/authentication"
import { catchError, response } from "@/lib/helperFunction"
import { clearSessionCookie } from "@/lib/services/authService"
import AdminModel from "@/models/Admin.model"

// "Sign out everywhere": bumping sessionVersion invalidates every issued
// session token (including this one) on its next server check.
export async function POST(request: Request) {
    try {
        const guard = await requireAdmin(request)
        if (!guard.ok) return guard.res

        await AdminModel.updateOne({ _id: guard.admin.id }, { $inc: { sessionVersion: 1 } })

        const res = response(true, 200, "Signed out on every device.")
        clearSessionCookie(res)
        return res
    } catch (error) {
        return catchError(error)
    }
}
