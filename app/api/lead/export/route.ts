import { requireAdmin } from "@/lib/authentication"
import { toCsv } from "@/lib/csv"
import { connectDB } from "@/lib/databaseConnection"
import { catchError, response } from "@/lib/helperFunction"
import { LEAD_LIMITS, inquiryLabel, statusMeta } from "@/lib/leadConfig"
import { buildLeadQuery, parseLeadListParams } from "@/lib/services/leadService"
import { objectIdSchema } from "@/lib/zodSchema"
import LeadModel from "@/models/Lead.model"

// CSV of the current list filters, or of selected rows (?ids=a,b,c).
// Built server-side with formula-injection escaping (see lib/csv.ts).
export async function GET(request: Request) {
    try {
        const guard = await requireAdmin(request)
        if (!guard.ok) return guard.res

        const searchParams = new URL(request.url).searchParams
        const params = parseLeadListParams(searchParams)
        const { filter, sort } = buildLeadQuery(params)

        const ids = (searchParams.get("ids") ?? "")
            .split(",")
            .filter((id) => objectIdSchema.safeParse(id).success)
            .slice(0, LEAD_LIMITS.exportMax)
        if (ids.length) Object.assign(filter, { _id: { $in: ids } })

        await connectDB()
        const total = await LeadModel.countDocuments(filter)
        if (total > LEAD_LIMITS.exportMax) {
            return response(false, 413, `That's ${total} leads — narrow the filters to ${LEAD_LIMITS.exportMax} or fewer to export.`)
        }

        const leads = await LeadModel.find(filter).sort(sort).lean()
        const csv = toCsv(
            ["Reference", "Received (UTC)", "Name", "Email", "Organisation", "Phone", "About", "From link", "Status", "Read", "Message", "Notes"],
            leads.map((lead) => [
                lead.ticketId,
                lead.createdAt,
                lead.name,
                lead.email,
                lead.organisation,
                lead.phone,
                inquiryLabel(lead.inquiryType),
                lead.source,
                statusMeta(lead.status).label,
                lead.isRead ? "Yes" : "No",
                lead.message,
                lead.adminNotes,
            ])
        )

        const date = new Date().toISOString().slice(0, 10)
        const name = params.view === "trash" ? `leads-trash-${date}.csv` : `leads-${date}.csv`
        return new Response(csv, {
            status: 200,
            headers: {
                "Content-Type": "text/csv; charset=utf-8",
                "Content-Disposition": `attachment; filename="${name}"`,
                "Cache-Control": "private, no-store",
            },
        })
    } catch (error) {
        return catchError(error, "Export failed.")
    }
}
