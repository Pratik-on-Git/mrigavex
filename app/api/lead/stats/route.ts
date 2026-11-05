import { requireAdmin } from "@/lib/authentication"
import { connectDB } from "@/lib/databaseConnection"
import { catchError, response } from "@/lib/helperFunction"
import { getLeadStats } from "@/lib/services/leadService"

// Dashboard figures + the sidebar's unread badge.
export async function GET(request: Request) {
    try {
        const guard = await requireAdmin(request)
        if (!guard.ok) return guard.res

        await connectDB()
        return response(true, 200, "Stats loaded.", await getLeadStats(), { headers: { "Cache-Control": "private, no-store" } })
    } catch (error) {
        return catchError(error, "Couldn't load stats.")
    }
}
