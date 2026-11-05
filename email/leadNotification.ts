import { absoluteUrl } from "@/lib/site"
import { inquiryLabel } from "@/lib/leadConfig"
import { ADMIN_LEAD_DETAILS } from "@/routes/AdminPanelRoute"
import { button, detailRows, emailShell, esc, formatDateTime, heading, link, nl2br, paragraph } from "./_shared"

type LeadForEmail = {
    _id: string
    ticketId: string
    name: string
    email: string
    organisation: string
    phone: string
    inquiryType: string
    source: string
    message: string
    createdAt: Date
}

/**
 * New-lead alert to the owner. Reply-To is set to the visitor by the caller,
 * so hitting Reply answers them directly. All visitor input is escaped.
 */
export function leadNotificationEmail(lead: LeadForEmail) {
    const subject = `New enquiry [${lead.ticketId}] · ${inquiryLabel(lead.inquiryType)} · ${lead.name}`.slice(0, 180)

    const bodyHtml = `
${heading("New enquiry from your website")}
${paragraph(`<strong>${esc(lead.name)}</strong> sent a message about <strong>${esc(inquiryLabel(lead.inquiryType))}</strong>.`)}
${detailRows([
        ["Reference", esc(lead.ticketId)],
        ["Name", esc(lead.name)],
        ["Email", link(lead.email, `mailto:${lead.email}`)],
        ["Organisation", esc(lead.organisation || "—")],
        ["Phone", lead.phone ? link(lead.phone, `tel:${lead.phone.replace(/[^\d+]/g, "")}`) : ""],
        ["About", esc(inquiryLabel(lead.inquiryType))],
        ["From link", esc(lead.source || "—")],
        ["Received", esc(formatDateTime(lead.createdAt))],
        ["Message", nl2br(lead.message)],
    ])}
${button("Open in admin", absoluteUrl(ADMIN_LEAD_DETAILS(lead._id)))}
${paragraph('<span style="font-size:13px;">Reply to this email to answer them directly.</span>')}`

    return { subject, html: emailShell({ preheader: `${lead.name}: ${lead.message.slice(0, 90)}`, bodyHtml }) }
}
