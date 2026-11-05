// Display formatting for the admin UI (client-side, viewer's time zone).

const dateTime = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" })
const dateOnly = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" })
const relative = new Intl.RelativeTimeFormat("en", { numeric: "auto" })

const valid = (value: string | Date | null | undefined) => {
    if (!value) return null
    const date = value instanceof Date ? value : new Date(value)
    return Number.isNaN(date.getTime()) ? null : date
}

export const formatDateTime = (value: string | Date | null | undefined) => {
    const date = valid(value)
    return date ? dateTime.format(date) : "—"
}

export const formatDate = (value: string | Date | null | undefined) => {
    const date = valid(value)
    return date ? dateOnly.format(date) : "—"
}

// "just now", "5 minutes ago", "yesterday"; full date after a week.
export const formatRelative = (value: string | Date | null | undefined, now = Date.now()) => {
    const date = valid(value)
    if (!date) return "—"
    const seconds = Math.round((date.getTime() - now) / 1000)
    const abs = Math.abs(seconds)
    if (abs < 45) return "just now"
    if (abs < 3600) return relative.format(Math.round(seconds / 60), "minute")
    if (abs < 86400) return relative.format(Math.round(seconds / 3600), "hour")
    if (abs < 7 * 86400) return relative.format(Math.round(seconds / 86400), "day")
    return dateOnly.format(date)
}

// wa.me needs digits with country code. A bare 10-digit number starting 6–9
// is treated as Indian (+91); anything else is used as typed.
export const whatsappLink = (phone: string) => {
    let digits = phone.replace(/\D/g, "")
    if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1)
    if (digits.length === 10 && /^[6-9]/.test(digits)) digits = `91${digits}`
    return digits.length >= 8 ? `https://wa.me/${digits}` : null
}

export const telLink = (phone: string) => {
    const cleaned = phone.replace(/[^\d+]/g, "")
    return cleaned.length >= 6 ? `tel:${cleaned}` : null
}
