import { requireAdmin } from "@/lib/authentication"
import { connectDB } from "@/lib/databaseConnection"
import { catchError, response } from "@/lib/helperFunction"
import { serializeLead } from "@/lib/services/leadService"
import { objectIdSchema } from "@/lib/zodSchema"
import LeadModel, { type Lead } from "@/models/Lead.model"

// One lead (live or trashed). Opening a live, unread lead marks it read —
// the same behaviour as EnergyFlow's contact queries.
export async function GET(request: Request, ctx: RouteContext<"/api/lead/get/[id]">) {
    try {
        const guard = await requireAdmin(request)
        if (!guard.ok) return guard.res

        const { id } = await ctx.params
        if (!objectIdSchema.safeParse(id).success) return response(false, 404, "Lead not found.")

        await connectDB()
        let lead = await LeadModel.findById(id).lean()
        if (!lead) return response(false, 404, "Lead not found.")

        if (!lead.isRead && !lead.deletedAt) {
            // timestamps:false so reading doesn't bump updatedAt — the editor
            // uses updatedAt to detect real concurrent edits.
            const marked = await LeadModel.findOneAndUpdate(
                { _id: id, isRead: false },
                { $set: { isRead: true, readAt: new Date() } },
                { returnDocument: "after", timestamps: false }
            ).lean()
            if (marked) lead = marked
        }

        return response(true, 200, "Lead loaded.", serializeLead(lead as Lead), { headers: { "Cache-Control": "private, no-store" } })
    } catch (error) {
        return catchError(error, "Couldn't load this lead.")
    }
}
