// Single source of truth for lead (contact-form) vocabularies. Shared by the
// Mongoose model, Zod schemas, API routes, the public form and the admin UI,
// so a label or limit is only ever changed here.
//
// Pure module (no "@/" imports): unit tests import it directly with Node.

export const LEAD_TICKET_PREFIX = "MX"

// The firm's practice areas, plus a catch-all for everything else.
export const INQUIRY_TYPES = [
    { value: "ai", label: "AI & Technology", hint: "AI strategy and technology transformation" },
    { value: "financial", label: "Financial Services", hint: "Financial services transformation" },
    { value: "venture", label: "Venture & Growth", hint: "Responsible venture and business growth" },
    { value: "general", label: "General enquiry", hint: "Anything else" },
] as const

export type InquiryType = (typeof INQUIRY_TYPES)[number]["value"]
export const INQUIRY_TYPE_VALUES = INQUIRY_TYPES.map((type) => type.value) as [InquiryType, ...InquiryType[]]

// Practice area link that sent the visitor to the form (?for=…).
export const LEAD_SOURCES = ["ai", "financial", "venture", "contact"] as const
export type LeadSource = (typeof LEAD_SOURCES)[number]

// Inquiry type recorded for a lead arriving through that link.
export const SOURCE_DEFAULT_TYPE: Record<LeadSource, InquiryType> = {
    ai: "ai",
    financial: "financial",
    venture: "venture",
    contact: "general",
}

// Pipeline the owner moves a lead through. `tone` drives badge colours.
export const LEAD_STATUSES = [
    { value: "new", label: "New", tone: "info", description: "Not handled yet." },
    { value: "contacted", label: "Contacted", tone: "warning", description: "You replied or reached out." },
    { value: "in_progress", label: "In discussion", tone: "warning", description: "Scoping, quoting or negotiating." },
    { value: "won", label: "Won", tone: "success", description: "Confirmed work." },
    { value: "closed", label: "Closed", tone: "muted", description: "No further action (declined, spam, not a fit)." },
] as const

export type LeadStatus = (typeof LEAD_STATUSES)[number]["value"]
export const LEAD_STATUS_VALUES = LEAD_STATUSES.map((status) => status.value) as [LeadStatus, ...LeadStatus[]]

export const LEAD_LIMITS = {
    nameMin: 2,
    nameMax: 80,
    emailMax: 254,
    organisationMax: 120,
    phoneMax: 24,
    messageMin: 10,
    messageMax: 2000,
    notesMax: 4000,
    searchMax: 200,
    pageSizeMax: 100,
    bulkMax: 100,
    exportMax: 5000,
} as const

export const LEAD_SORTS = [
    { value: "newest", label: "Newest first" },
    { value: "oldest", label: "Oldest first" },
    { value: "name", label: "Name A–Z" },
] as const
export type LeadSort = (typeof LEAD_SORTS)[number]["value"]

// Public form anti-abuse. Submissions faster than this after the form mounted
// are treated as bots (no human types a 10-character message that fast).
export const MIN_FILL_MS = 2500
// Same email + same message inside this window returns the first ticket.
export const DUPLICATE_WINDOW_MS = 10 * 60 * 1000

export const statusMeta = (value: string) =>
    LEAD_STATUSES.find((status) => status.value === value) ?? LEAD_STATUSES[0]

export const inquiryLabel = (value: string) =>
    INQUIRY_TYPES.find((type) => type.value === value)?.label ?? "Unspecified"

export const isLeadSource = (value: unknown): value is LeadSource =>
    typeof value === "string" && (LEAD_SOURCES as readonly string[]).includes(value)
