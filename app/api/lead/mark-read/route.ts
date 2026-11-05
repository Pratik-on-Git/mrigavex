import { z } from "zod"
import { requireAdmin } from "@/lib/authentication"
import { connectDB } from "@/lib/databaseConnection"
import { catchError, readJson, response, validationError } from "@/lib/helperFunction"
import { idListSchema } from "@/lib/zodSchema"
import LeadModel from "@/models/Lead.model"

const schema = z.object({ ids: idListSchema, isRead: z.boolean() })

// Bulk read/unread from the list. Doesn't touch updatedAt, so it never
// conflicts with an open editor.
export async function PUT(request: Request) {
    try {
        const guard = await requireAdmin(request)
        if (!guard.ok) return guard.res

        const parsed = schema.safeParse(await readJson(request))
        if (!parsed.success) return validationError(parsed.error)
        const { ids, isRead } = parsed.data

        await connectDB()
        const result = await LeadModel.updateMany(
            { _id: { $in: ids }, deletedAt: null, isRead: !isRead },
            { $set: { isRead, readAt: isRead ? new Date() : null } },
            { timestamps: false }
        )

        const count = result.modifiedCount
        const label = isRead ? "read" : "unread"
        return response(true, 200, count ? `Marked ${count} lead${count === 1 ? "" : "s"} as ${label}.` : `Already ${label}.`, { count })
    } catch (error) {
        return catchError(error)
    }
}
