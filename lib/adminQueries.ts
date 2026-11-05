"use client"

import { adminFetch } from "@/lib/apiClient"
import type { LeadDTO } from "@/lib/services/leadService"

// React Query keys + fetchers for the admin portal, in one place so every
// mutation invalidates the same keys the screens read.
export const QUERY_KEYS = {
    me: ["admin-me"] as const,
    stats: ["lead-stats"] as const,
    leads: ["leads"] as const,
    lead: (id: string) => ["lead", id] as const,
}

export type { LeadDTO }

export type LeadList = { items: LeadDTO[]; total: number; page: number; size: number; pageCount: number }

export type LeadStats = {
    total: number
    unread: number
    thisWeek: number
    lastWeek: number
    trashed: number
    byStatus: Record<string, number>
    byType: Record<string, number>
    latest: LeadDTO[]
}

export type AdminMe = { email: string; name: string; lastLoginAt: string | null; passwordChangedAt: string | null }

export const fetchMe = async () => (await adminFetch<AdminMe>("/api/auth/me")).data
export const fetchStats = async () => (await adminFetch<LeadStats>("/api/lead/stats")).data
export const fetchLeads = async (query: string, signal?: AbortSignal) => (await adminFetch<LeadList>(`/api/lead?${query}`, { signal })).data
export const fetchLead = async (id: string) => (await adminFetch<LeadDTO>(`/api/lead/get/${id}`)).data
