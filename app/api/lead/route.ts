import { after } from "next/server"
import { requireAdmin } from "@/lib/authentication"
import { connectDB } from "@/lib/databaseConnection"
import { generateTicketId } from "@/lib/generateTicketId"
import { catchError, readJson, response, validationError } from "@/lib/helperFunction"
import { LEAD_TICKET_PREFIX, MIN_FILL_MS } from "@/lib/leadConfig"
import { rateLimit } from "@/lib/rateLimit"
import { clientIp, hashIp, isSameOrigin } from "@/lib/request"
import { leadNotificationRecipients, sendMail } from "@/lib/sendMail"
import { createLead, findRecentDuplicate, leadFingerprint, listLeads, parseLeadListParams } from "@/lib/services/leadService"
import { leadSubmitSchema } from "@/lib/zodSchema"
import { leadNotificationEmail } from "@/email/leadNotification"
import LeadModel from "@/models/Lead.model"

const MAX_BODY_BYTES = 16 * 1024
const PER_IP = { limit: 5, windowMs: 10 * 60 * 1000 }

// GET — admin list (search, filters, sort, paging; ?view=trash for the trash).
export async function GET(request: Request) {
    try {
        const guard = await requireAdmin(request)
        if (!guard.ok) return guard.res

        await connectDB()
        const params = parseLeadListParams(new URL(request.url).searchParams)
        const data = await listLeads(params)
        return response(true, 200, "Leads loaded.", data, { headers: { "Cache-Control": "private, no-store" } })
    } catch (error) {
        return catchError(error, "Couldn't load leads.")
    }
}

// POST — public contact form. Validated, de-duplicated and throttled; the
// owner is emailed after the response is sent, so a slow or failing SMTP
// server never delays or fails the visitor's submission.
export async function POST(request: Request) {
    try {
        if (!isSameOrigin(request)) return response(false, 403, "Request blocked.")

        const length = Number(request.headers.get("content-length") || 0)
        if (length > MAX_BODY_BYTES) return response(false, 413, "That message is too long.")

        const ip = clientIp(request)
        const limit = rateLimit(`lead:${ip}`, PER_IP.limit, PER_IP.windowMs)
        if (!limit.ok) {
            return response(false, 429, "You've sent several messages already. Please try again a little later.", {
                retryAfter: limit.retryAfterSeconds,
            }, { headers: { "Retry-After": String(limit.retryAfterSeconds) } })
        }

        const parsed = leadSubmitSchema.safeParse(await readJson(request))
        if (!parsed.success) return validationError(parsed.error)
        const { website, elapsedMs, source, ...form } = parsed.data

        // Bots: honeypot filled, or submitted faster than a person can type.
        // They get a normal-looking success so they don't adapt.
        if (website || (elapsedMs !== undefined && elapsedMs < MIN_FILL_MS)) {
            return response(true, 201, "Message received.", { ticketId: generateTicketId(LEAD_TICKET_PREFIX) })
        }

        await connectDB()
        const fingerprint = leadFingerprint(form.email, form.message)
        const duplicate = await findRecentDuplicate(fingerprint)
        if (duplicate) {
            return response(true, 200, "Message received.", { ticketId: duplicate.ticketId, duplicate: true })
        }

        const lead = await createLead(form, {
            source,
            fingerprint,
            ipHash: hashIp(ip),
            userAgent: request.headers.get("user-agent") ?? "",
        })

        after(async () => {
            const recipients = leadNotificationRecipients()
            if (!recipients.length) return
            const { subject, html } = leadNotificationEmail({
                _id: String(lead._id),
                ticketId: lead.ticketId,
                name: lead.name,
                email: lead.email,
                organisation: lead.organisation ?? "",
                phone: lead.phone ?? "",
                inquiryType: lead.inquiryType,
                source: lead.source ?? "",
                message: lead.message,
                createdAt: lead.createdAt,
            })
            const result = await sendMail(subject, recipients, html, { replyTo: `"${lead.name.replace(/["\\]/g, "")}" <${lead.email}>` })
            await LeadModel.updateOne(
                { _id: lead._id },
                { $set: result.success ? { notifiedAt: new Date(), notifyError: "" } : { notifyError: result.message.slice(0, 300) } }
            ).catch((error) => console.error("[lead] notify status not saved", error?.message))
        })

        return response(true, 201, "Message received.", { ticketId: lead.ticketId })
    } catch (error) {
        return catchError(error, "Your message couldn't be sent. Please try again.")
    }
}
