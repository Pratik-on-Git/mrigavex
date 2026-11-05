"use client"

import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { ArrowRightIcon, InboxIcon, TriangleAlertIcon } from "lucide-react"
import AdminEmptyState from "@/components/Application/Admin/AdminEmptyState"
import LeadStatusBadge from "@/components/Application/Admin/leads/LeadStatusBadge"
import { Skeleton } from "@/components/ui/skeleton"
import { QUERY_KEYS, fetchStats } from "@/lib/adminQueries"
import { ApiError } from "@/lib/apiClient"
import { formatDateTime, formatRelative } from "@/lib/format"
import { INQUIRY_TYPES, LEAD_STATUSES, inquiryLabel } from "@/lib/leadConfig"
import { cn } from "@/lib/utils"
import { ADMIN_LEAD_DETAILS, ADMIN_LEADS_SHOW, ADMIN_TRASH_OF } from "@/routes/AdminPanelRoute"

// Week-over-week change; null when there's nothing to compare against.
const change = (current: number, previous: number) => (previous ? Math.round(((current - previous) / previous) * 100) : null)

export default function DashboardOverview() {
    const { data, isPending, error, refetch } = useQuery({ queryKey: QUERY_KEYS.stats, queryFn: fetchStats, refetchInterval: 60_000 })

    if (isPending) {
        return (
            <div className="flex flex-col gap-6">
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                    {Array.from({ length: 4 }, (_, index) => (
                        <Skeleton key={index} className="h-28 rounded-xl" />
                    ))}
                </div>
                <Skeleton className="h-72 rounded-xl" />
            </div>
        )
    }

    if (error || !data) {
        return (
            <div className="rounded-xl border border-border bg-background">
                <AdminEmptyState
                    icon={TriangleAlertIcon}
                    tone="danger"
                    title="Couldn't load the dashboard"
                    description={error instanceof ApiError ? error.message : "Please try again."}
                    action={{ label: "Retry", onClick: () => refetch() }}
                />
            </div>
        )
    }

    const weekChange = change(data.thisWeek, data.lastWeek)

    return (
        <div className="flex flex-col gap-6">
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <StatCard label="Unread" value={data.unread} href={`${ADMIN_LEADS_SHOW}?read=unread`} emphasis={data.unread > 0} />
                <StatCard label="New this week" value={data.thisWeek} note={weekChange === null ? "Last 7 days" : `${weekChange > 0 ? "+" : ""}${weekChange}% vs previous 7 days`} />
                <StatCard label="All leads" value={data.total} href={ADMIN_LEADS_SHOW} />
                <StatCard label="In trash" value={data.trashed} href={ADMIN_TRASH_OF("leads")} />
            </div>

            <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
                <section className="rounded-xl border border-border bg-background" aria-labelledby="latest-heading">
                    <div className="flex items-center justify-between border-b border-border px-5 py-4">
                        <h2 id="latest-heading" className="text-sm font-semibold">
                            Latest leads
                        </h2>
                        <Link href={ADMIN_LEADS_SHOW} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                            View all <ArrowRightIcon className="size-3.5" />
                        </Link>
                    </div>
                    {data.latest.length ? (
                        <ul className="divide-y divide-border">
                            {data.latest.map((lead) => (
                                <li key={lead._id}>
                                    <Link href={ADMIN_LEAD_DETAILS(lead._id)} className="flex items-center gap-3 px-5 py-3.5 hover:bg-muted/50">
                                        <span className={cn("size-2 shrink-0 rounded-full", lead.isRead ? "bg-transparent" : "bg-sky-500")} aria-label={lead.isRead ? undefined : "Unread"} />
                                        <span className="min-w-0 flex-1">
                                            <span className={cn("block truncate text-sm", !lead.isRead && "font-semibold")}>{lead.name}</span>
                                            <span className="block truncate text-xs text-muted-foreground">
                                                {inquiryLabel(lead.inquiryType)} · {lead.message}
                                            </span>
                                        </span>
                                        <span className="hidden sm:block">
                                            <LeadStatusBadge status={lead.status} />
                                        </span>
                                        <time dateTime={lead.createdAt} title={formatDateTime(lead.createdAt)} className="shrink-0 text-xs text-muted-foreground">
                                            {formatRelative(lead.createdAt)}
                                        </time>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <AdminEmptyState icon={InboxIcon} title="No leads yet" description="Messages from the contact form will appear here." />
                    )}
                </section>

                <div className="flex flex-col gap-6">
                    <Breakdown
                        title="By status"
                        total={data.total}
                        rows={LEAD_STATUSES.map((status) => ({
                            label: status.label,
                            count: data.byStatus[status.value] ?? 0,
                            href: `${ADMIN_LEADS_SHOW}?status=${status.value}`,
                        }))}
                    />
                    <Breakdown
                        title="By topic"
                        total={data.total}
                        rows={INQUIRY_TYPES.map((type) => ({
                            label: type.label,
                            count: data.byType[type.value] ?? 0,
                            href: `${ADMIN_LEADS_SHOW}?type=${type.value}`,
                        }))}
                    />
                </div>
            </div>
        </div>
    )
}

function StatCard({ label, value, note, href, emphasis }: { label: string; value: number; note?: string; href?: string; emphasis?: boolean }) {
    const body = (
        <>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className={cn("mt-2 font-mono text-3xl font-semibold tracking-tight", emphasis && "text-sky-600 dark:text-sky-400")}>{value.toLocaleString("en-GB")}</p>
            {note && <p className="mt-1 text-xs text-muted-foreground">{note}</p>}
        </>
    )
    const className = "rounded-xl border border-border bg-background p-5"
    return href ? (
        <Link href={href} className={cn(className, "transition-colors hover:bg-muted/40")}>
            {body}
        </Link>
    ) : (
        <div className={className}>{body}</div>
    )
}

function Breakdown({ title, total, rows }: { title: string; total: number; rows: { label: string; count: number; href: string }[] }) {
    return (
        <section className="rounded-xl border border-border bg-background p-5" aria-label={title}>
            <h2 className="mb-4 text-sm font-semibold">{title}</h2>
            <ul className="flex flex-col gap-3">
                {rows.map((row) => {
                    const share = total ? Math.round((row.count / total) * 100) : 0
                    return (
                        <li key={row.label}>
                            <Link href={row.href} className="group block">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="group-hover:underline">{row.label}</span>
                                    <span className="font-mono text-xs text-muted-foreground">{row.count}</span>
                                </div>
                                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
                                    <div className="h-full rounded-full bg-foreground/70" style={{ width: `${share}%` }} />
                                </div>
                            </Link>
                        </li>
                    )
                })}
            </ul>
        </section>
    )
}
