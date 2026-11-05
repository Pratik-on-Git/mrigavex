import "server-only"
import { createHash } from "node:crypto"
import type { QueryFilter, SortOrder } from "mongoose"
import { escapeRegex } from "@/lib/helperFunction"
import { generateTicketId } from "@/lib/generateTicketId"
import {
    DUPLICATE_WINDOW_MS,
    INQUIRY_TYPE_VALUES,
    LEAD_LIMITS,
    LEAD_SORTS,
    LEAD_STATUS_VALUES,
    LEAD_TICKET_PREFIX,
    type InquiryType,
    type LeadSort,
    type LeadSource,
    type LeadStatus,
} from "@/lib/leadConfig"
import type { LeadFormValues } from "@/lib/zodSchema"
import LeadModel, { type Lead } from "@/models/Lead.model"

// ── Serialisation ────────────────────────────────────────────────────
// What the admin UI receives. Internal fields (fingerprint, ipHash) never
// leave the server.
export type LeadDTO = {
    _id: string
    ticketId: string
    name: string
    email: string
    organisation: string
    phone: string
    inquiryType: string
    message: string
    source: string
    status: LeadStatus
    statusHistory: { status: LeadStatus; at: string }[]
    adminNotes: string
    isRead: boolean
    readAt: string | null
    userAgent: string
    notifiedAt: string | null
    notifyError: string
    deletedAt: string | null
    createdAt: string
    updatedAt: string
}

const iso = (value: unknown) => (value ? new Date(value as string).toISOString() : null)

export function serializeLead(lead: Lead): LeadDTO {
    return {
        _id: String(lead._id),
        ticketId: lead.ticketId,
        name: lead.name,
        email: lead.email,
        organisation: lead.organisation ?? "",
        phone: lead.phone ?? "",
        inquiryType: lead.inquiryType,
        message: lead.message,
        source: lead.source ?? "",
        status: lead.status as LeadStatus,
        statusHistory: (lead.statusHistory ?? []).map((entry) => ({
            status: entry.status as LeadStatus,
            at: iso(entry.at) ?? "",
        })),
        adminNotes: lead.adminNotes ?? "",
        isRead: Boolean(lead.isRead),
        readAt: iso(lead.readAt),
        userAgent: lead.userAgent ?? "",
        notifiedAt: iso(lead.notifiedAt),
        notifyError: lead.notifyError ?? "",
        deletedAt: iso(lead.deletedAt),
        createdAt: iso(lead.createdAt) ?? "",
        updatedAt: iso(lead.updatedAt) ?? "",
    }
}

// Light list projection — the table never needs notes or history.
export const LEAD_LIST_FIELDS = "ticketId name email organisation phone inquiryType message source status isRead deletedAt createdAt updatedAt"

// ── Creation ─────────────────────────────────────────────────────────
export function leadFingerprint(email: string, message: string) {
    const normalised = message.toLowerCase().replace(/\s+/g, " ").trim()
    return createHash("sha256").update(`${email}\n${normalised}`).digest("hex")
}

// A double-click, a retried request or a refreshed tab re-posting the same
// message returns the original lead instead of creating a duplicate.
export async function findRecentDuplicate(fingerprint: string) {
    return LeadModel.findOne({
        fingerprint,
        createdAt: { $gte: new Date(Date.now() - DUPLICATE_WINDOW_MS) },
    })
        .select("ticketId")
        .lean()
}

type CreateMeta = { source?: LeadSource; ipHash: string; userAgent: string; fingerprint: string }

export async function createLead(input: LeadFormValues, meta: CreateMeta) {
    const now = new Date()
    // Ticket ids are random; retry the rare collision instead of failing.
    for (let attempt = 0; attempt < 5; attempt += 1) {
        try {
            return await LeadModel.create({
                ...input,
                ticketId: generateTicketId(LEAD_TICKET_PREFIX),
                source: meta.source ?? "",
                status: "new",
                statusHistory: [{ status: "new", at: now }],
                fingerprint: meta.fingerprint,
                ipHash: meta.ipHash,
                userAgent: meta.userAgent.slice(0, 300),
            })
        } catch (error) {
            const err = error as { code?: number; keyPattern?: Record<string, unknown> }
            if (err.code === 11000 && err.keyPattern?.ticketId) continue
            throw error
        }
    }
    throw new Error("Could not allocate a reference number. Please try again.")
}

// ── Listing ──────────────────────────────────────────────────────────
export type LeadView = "inbox" | "trash"

export type LeadListParams = {
    view: LeadView
    page: number
    size: number
    q: string
    status: LeadStatus[]
    type: InquiryType[]
    read: "all" | "read" | "unread"
    sort: LeadSort
}

const listOf = <T extends string>(raw: string | null, allowed: readonly T[]) =>
    (raw ?? "")
        .split(",")
        .map((value) => value.trim())
        .filter((value): value is T => (allowed as readonly string[]).includes(value))

// Untrusted query string → bounded, whitelisted params. Never throws; junk
// falls back to defaults so a hand-edited URL can't 500 the page.
export function parseLeadListParams(searchParams: URLSearchParams): LeadListParams {
    const int = (raw: string | null, fallback: number, min: number, max: number) => {
        const value = Number.parseInt(raw ?? "", 10)
        return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback
    }
    const sort = searchParams.get("sort")
    const read = searchParams.get("read")

    return {
        view: searchParams.get("view") === "trash" ? "trash" : "inbox",
        page: int(searchParams.get("page"), 1, 1, 100_000),
        size: int(searchParams.get("size"), 20, 1, LEAD_LIMITS.pageSizeMax),
        q: (searchParams.get("q") ?? "").trim().slice(0, LEAD_LIMITS.searchMax),
        status: [...new Set(listOf(searchParams.get("status"), LEAD_STATUS_VALUES))],
        type: [...new Set(listOf(searchParams.get("type"), INQUIRY_TYPE_VALUES))],
        read: read === "read" || read === "unread" ? read : "all",
        sort: LEAD_SORTS.some((option) => option.value === sort) ? (sort as LeadSort) : "newest",
    }
}

export function buildLeadQuery(params: Pick<LeadListParams, "view" | "q" | "status" | "type" | "read" | "sort">) {
    const filter: QueryFilter<Lead> = params.view === "trash" ? { deletedAt: { $ne: null } } : { deletedAt: null }

    if (params.status.length) filter.status = { $in: params.status }
    if (params.type.length) filter.inquiryType = { $in: params.type }
    if (params.read === "read") filter.isRead = true
    if (params.read === "unread") filter.isRead = false

    if (params.q) {
        // Every word must match somewhere (AND), each word may match any field.
        const words = params.q.split(/\s+/).filter(Boolean).slice(0, 6)
        filter.$and = words.map((word) => {
            const pattern = new RegExp(escapeRegex(word), "i")
            return {
                $or: [{ name: pattern }, { email: pattern }, { organisation: pattern }, { ticketId: pattern }, { phone: pattern }, { message: pattern }],
            }
        })
    }

    const sort: Record<string, SortOrder> =
        params.sort === "oldest"
            ? { createdAt: 1, _id: 1 }
            : params.sort === "name"
              ? { name: 1, createdAt: -1, _id: -1 }
              : { createdAt: -1, _id: -1 }

    return { filter, sort }
}

export async function listLeads(params: LeadListParams) {
    const { filter, sort } = buildLeadQuery(params)
    const total = await LeadModel.countDocuments(filter)
    const pageCount = Math.max(1, Math.ceil(total / params.size))
    // A deleted last row or a stale bookmark can point past the end: serve the
    // last real page instead of an empty one.
    const page = Math.min(params.page, pageCount)

    const items = await LeadModel.find(filter)
        .sort(sort)
        .skip((page - 1) * params.size)
        .limit(params.size)
        .select(LEAD_LIST_FIELDS)
        .collation({ locale: "en", strength: 2 })
        .lean()

    return {
        items: items.map((lead) => serializeLead(lead as Lead)),
        total,
        page,
        size: params.size,
        pageCount,
    }
}

// ── Stats ────────────────────────────────────────────────────────────
export async function getLeadStats() {
    const live = { deletedAt: null }
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const prevWeek = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)

    const [total, unread, thisWeek, lastWeek, trashed, byStatus, byType, latest] = await Promise.all([
        LeadModel.countDocuments(live),
        LeadModel.countDocuments({ ...live, isRead: false }),
        LeadModel.countDocuments({ ...live, createdAt: { $gte: weekAgo } }),
        LeadModel.countDocuments({ ...live, createdAt: { $gte: prevWeek, $lt: weekAgo } }),
        LeadModel.countDocuments({ deletedAt: { $ne: null } }),
        LeadModel.aggregate<{ _id: string; count: number }>([{ $match: live }, { $group: { _id: "$status", count: { $sum: 1 } } }]),
        LeadModel.aggregate<{ _id: string; count: number }>([{ $match: live }, { $group: { _id: "$inquiryType", count: { $sum: 1 } } }]),
        LeadModel.find(live).sort({ createdAt: -1, _id: -1 }).limit(6).select(LEAD_LIST_FIELDS).lean(),
    ])

    const toMap = (rows: { _id: string; count: number }[]) =>
        Object.fromEntries(rows.filter((row) => row._id).map((row) => [row._id, row.count]))

    return {
        total,
        unread,
        thisWeek,
        lastWeek,
        trashed,
        byStatus: toMap(byStatus),
        byType: toMap(byType),
        latest: latest.map((lead) => serializeLead(lead as Lead)),
    }
}
