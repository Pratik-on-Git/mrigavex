import { requireAdmin } from "@/lib/authentication"
import { connectDB } from "@/lib/databaseConnection"
import { catchError, readJson, response, validationError } from "@/lib/helperFunction"
import { serializeLead } from "@/lib/services/leadService"
import { leadUpdateSchema } from "@/lib/zodSchema"
import LeadModel, { type Lead } from "@/models/Lead.model"

// Status and/or private notes. With `updatedAt`, the save only applies if the
// lead hasn't changed since the editor loaded it (two tabs, or the phone and
// the laptop) — otherwise 409 and the editor offers to reload.
export async function PUT(request: Request) {
    try {
        const guard = await requireAdmin(request)
        if (!guard.ok) return guard.res

        const parsed = leadUpdateSchema.safeParse(await readJson(request))
        if (!parsed.success) return validationError(parsed.error)
        const { _id, status, adminNotes, updatedAt } = parsed.data

        await connectDB()
        const current = await LeadModel.findOne({ _id, deletedAt: null }).select("status updatedAt").lean()
        if (!current) return response(false, 404, "This lead no longer exists or is in the trash.")

        if (updatedAt && new Date(updatedAt).getTime() !== new Date(current.updatedAt).getTime()) {
            return response(false, 409, "This lead was changed somewhere else. Reload it before saving again.")
        }

        const set: Record<string, unknown> = {}
        const update: Record<string, unknown> = { $set: set }
        if (adminNotes !== undefined) set.adminNotes = adminNotes
        if (status !== undefined && status !== current.status) {
            set.status = status
            update.$push = { statusHistory: { status, at: new Date() } }
        }
        if (!Object.keys(set).length) {
            const lead = await LeadModel.findById(_id).lean()
            return response(true, 200, "No changes to save.", serializeLead(lead as Lead))
        }

        const saved = await LeadModel.findOneAndUpdate(
            { _id, deletedAt: null, updatedAt: current.updatedAt },
            update,
            { returnDocument: "after", runValidators: true }
        ).lean()
        if (!saved) return response(false, 409, "This lead was changed somewhere else. Reload it before saving again.")

        return response(true, 200, "Saved.", serializeLead(saved as Lead))
    } catch (error) {
        return catchError(error, "Couldn't save your changes.")
    }
}
