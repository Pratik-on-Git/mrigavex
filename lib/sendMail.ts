import "server-only"
import nodemailer, { type Transporter } from "nodemailer"
import { SITE } from "@/lib/site"

// SMTP mail (same approach as EnergyFlow's lib/sendMail.js): one lazily
// created pooled transport, and sendMail NEVER throws — callers get
// { success, message } and decide whether a failure matters.

let transporter: Transporter | null = null

export function isMailConfigured() {
    return Boolean(process.env.NODEMAILER_HOST && process.env.NODEMAILER_EMAIL && process.env.NODEMAILER_PASSWORD)
}

function getTransporter() {
    if (transporter) return transporter
    const port = Number(process.env.NODEMAILER_PORT || 587)
    transporter = nodemailer.createTransport({
        host: process.env.NODEMAILER_HOST,
        port,
        secure: port === 465,
        auth: { user: process.env.NODEMAILER_EMAIL, pass: process.env.NODEMAILER_PASSWORD },
        pool: true,
        maxConnections: 3,
        connectionTimeout: 10_000,
        greetingTimeout: 10_000,
        socketTimeout: 20_000,
    })
    return transporter
}

// Plain-text alternative so spam filters and text-only clients get a readable
// version: drop tags, keep link targets.
function htmlToText(html: string) {
    return html
        .replace(/<(style|script)[\s\S]*?<\/\1>/gi, "")
        .replace(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, (_m, href: string, label: string) => {
            const text = label.replace(/<[^>]+>/g, "").trim()
            return text && text !== href ? `${text} (${href})` : href
        })
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/(p|div|tr|h[1-6]|li)>/gi, "\n")
        .replace(/<[^>]+>/g, "")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/[ \t]+/g, " ")
        .replace(/\n\s*\n\s*\n+/g, "\n\n")
        .trim()
}

type MailOptions = { replyTo?: string; text?: string }

export async function sendMail(subject: string, to: string | string[], html: string, options: MailOptions = {}) {
    if (!isMailConfigured()) {
        return { success: false, message: "Mail is not configured (NODEMAILER_* variables)." }
    }
    try {
        await getTransporter().sendMail({
            from: `"${SITE.name}" <${process.env.NODEMAILER_EMAIL}>`,
            to,
            subject,
            html,
            text: options.text ?? htmlToText(html),
            replyTo: options.replyTo,
        })
        return { success: true, message: "Sent." }
    } catch (error) {
        const message = (error as Error)?.message || "Unknown mail error."
        console.error("[mail] send failed:", message)
        return { success: false, message }
    }
}

// Comma-separated LEAD_NOTIFICATION_EMAIL, falling back to the admin email.
export function leadNotificationRecipients(): string[] {
    const raw = process.env.LEAD_NOTIFICATION_EMAIL || process.env.ADMIN_EMAIL || ""
    return raw
        .split(",")
        .map((value) => value.trim())
        .filter((value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
}
