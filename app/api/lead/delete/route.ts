import { z } from "zod"
import { requireAdmin } from "@/lib/authentication"
import { connectDB } from "@/lib/databaseConnection"
import { catchError, readJson, response, validationError } from "@/lib/helperFunction"
import { idListSchema } from "@/lib/zodSchema"
import LeadModel from "@/models/Lead.model"

// EnergyFlow delete contract:
//   PUT    { ids, deleteType: "SD" }  → move to trash
//   PUT    { ids, deleteType: "RSD" } → restore from trash
//   DELETE { ids, deleteType: "PD" }  → delete forever (trashed items only)
// Unlike EnergyFlow's older routes, the PD guard is real: live leads can never
// be permanently deleted in one step.

const softSchema = z.object({ ids: idListSchema, deleteType: z.enum(["SD", "RSD"]) })
const hardSchema = z.object({ ids: idListSchema, deleteType: z.literal("PD") })

const plural = (count: number) => `${count} lead${count === 1 ? "" : "s"}`

export async function PUT(request: Request) {
    try {
        const guard = await requireAdmin(request)
        if (!guard.ok) return guard.res

        const parsed = softSchema.safeParse(await readJson(request))
        if (!parsed.success) return validationError(parsed.error)
        const { ids, deleteType } = parsed.data

        await connectDB()
        const toTrash = deleteType === "SD"
        const result = await LeadModel.updateMany(
            { _id: { $in: ids }, deletedAt: toTrash ? null : { $ne: null } },
            { $set: { deletedAt: toTrash ? new Date() : null } },
            { timestamps: false }
        )

        const count = result.modifiedCount
        if (!count) return response(false, 404, toTrash ? "Those leads are already in the trash." : "Those leads aren't in the trash.")
        return response(true, 200, toTrash ? `Moved ${plural(count)} to trash.` : `Restored ${plural(count)}.`, { count })
    } catch (error) {
        return catchError(error)
    }
}

export async function DELETE(request: Request) {
    try {
        const guard = await requireAdmin(request)
        if (!guard.ok) return guard.res

        const parsed = hardSchema.safeParse(await readJson(request))
        if (!parsed.success) return validationError(parsed.error)

        await connectDB()
        const result = await LeadModel.deleteMany({ _id: { $in: parsed.data.ids }, deletedAt: { $ne: null } })

        const count = result.deletedCount
        if (!count) return response(false, 404, "Only leads in the trash can be deleted permanently.")
        const skipped = parsed.data.ids.length - count
        return response(true, 200, `Deleted ${plural(count)} permanently.${skipped ? ` ${plural(skipped)} skipped (not in trash).` : ""}`, { count })
    } catch (error) {
        return catchError(error)
    }
}
