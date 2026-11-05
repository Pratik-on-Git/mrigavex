"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
    ArchiveRestoreIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    DownloadIcon,
    InboxIcon,
    Loader2Icon,
    MailIcon,
    MailOpenIcon,
    SearchIcon,
    SearchXIcon,
    Trash2Icon,
    TriangleAlertIcon,
    XIcon,
} from "lucide-react"
import { toast } from "sonner"
import AdminEmptyState from "@/components/Application/Admin/AdminEmptyState"
import ConfirmDialog from "@/components/Application/Admin/ConfirmDialog"
import LeadStatusBadge from "@/components/Application/Admin/leads/LeadStatusBadge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui/native-select"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import useDebounce from "@/hooks/useDebounce"
import { QUERY_KEYS, fetchLeads, type LeadDTO } from "@/lib/adminQueries"
import { ApiError, adminFetch } from "@/lib/apiClient"
import { formatDateTime, formatRelative } from "@/lib/format"
import { INQUIRY_TYPES, LEAD_LIMITS, LEAD_SORTS, LEAD_STATUSES, inquiryLabel } from "@/lib/leadConfig"
import { cn } from "@/lib/utils"
import { ADMIN_LEAD_DETAILS } from "@/routes/AdminPanelRoute"

type View = "inbox" | "trash"
type BulkAction = "read" | "unread" | "trash" | "restore" | "purge"

const PAGE_SIZES = [10, 20, 50, 100]
const EMPTY_SET: ReadonlySet<string> = new Set()
// URL keys this table owns; anything else in the URL (e.g. ?trashof=) is kept.
const FILTER_KEYS = ["q", "status", "type", "read", "sort"] as const

const BULK_CONFIRM: Partial<Record<BulkAction, { title: string; description: (n: number) => string; label: string; destructive?: boolean }>> = {
    trash: {
        title: "Move to trash?",
        description: (n) => `${n} lead${n === 1 ? "" : "s"} will move to the trash. You can restore them from there.`,
        label: "Move to trash",
    },
    purge: {
        title: "Delete permanently?",
        description: (n) => `${n} lead${n === 1 ? "" : "s"} will be deleted forever. This can't be undone.`,
        label: "Delete forever",
        destructive: true,
    },
}

export default function LeadsTable({ view }: { view: View }) {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const queryClient = useQueryClient()

    const page = Math.max(1, Number.parseInt(searchParams.get("page") ?? "1", 10) || 1)
    const sizeParam = Number.parseInt(searchParams.get("size") ?? "20", 10)
    const size = PAGE_SIZES.includes(sizeParam) ? sizeParam : 20
    const urlQ = searchParams.get("q") ?? ""
    const status = searchParams.get("status") ?? ""
    const type = searchParams.get("type") ?? ""
    const read = searchParams.get("read") ?? ""
    const sort = searchParams.get("sort") ?? "newest"
    const hasFilters = Boolean(urlQ || status || type || read)

    // Replace (not push) so filter tweaks don't flood the back button.
    const setParams = useCallback(
        (changes: Record<string, string | number | null>, resetPage = true) => {
            const next = new URLSearchParams(searchParams.toString())
            for (const [key, value] of Object.entries(changes)) {
                if (value === null || value === "" || (key === "sort" && value === "newest") || (key === "size" && value === 20)) next.delete(key)
                else next.set(key, String(value))
            }
            if (resetPage && !("page" in changes)) next.delete("page")
            if (next.get("page") === "1") next.delete("page")
            const qs = next.toString()
            if (qs !== searchParams.toString()) router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
        },
        [pathname, router, searchParams]
    )

    // Search box: local while typing, URL after a pause. Follows the URL when
    // it changes from outside (back/forward, "Clear filters").
    const [search, setSearch] = useState(urlQ)
    const debounced = useDebounce(search, 350)
    useEffect(() => {
        if (debounced.trim() !== urlQ) setParams({ q: debounced.trim() })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debounced])
    const [lastUrlQ, setLastUrlQ] = useState(urlQ)
    if (lastUrlQ !== urlQ) {
        setLastUrlQ(urlQ)
        if (search.trim() !== urlQ) setSearch(urlQ)
    }

    const query = useMemo(() => {
        const params = new URLSearchParams({ view, page: String(page), size: String(size), sort })
        if (urlQ) params.set("q", urlQ)
        if (status) params.set("status", status)
        if (type) params.set("type", type)
        if (read) params.set("read", read)
        return params.toString()
    }, [view, page, size, sort, urlQ, status, type, read])

    const { data, isPending, isError, error, refetch, isFetching, isPlaceholderData } = useQuery({
        queryKey: [...QUERY_KEYS.leads, query],
        queryFn: ({ signal }) => fetchLeads(query, signal),
        placeholderData: keepPreviousData,
        refetchInterval: view === "inbox" ? 60_000 : false,
    })

    // The server clamps a page past the end (last row deleted, old bookmark).
    useEffect(() => {
        if (data && !isPlaceholderData && data.page !== page) setParams({ page: data.page }, false)
    }, [data, isPlaceholderData, page, setParams])

    // Selection belongs to one page/filter combination: change either and it
    // is dropped, so a bulk action never touches rows the owner can't see.
    const [selection, setSelection] = useState<{ key: string; ids: ReadonlySet<string> }>({ key: query, ids: new Set() })
    const selected = selection.key === query ? selection.ids : EMPTY_SET
    const setSelected = (update: ReadonlySet<string> | ((current: ReadonlySet<string>) => ReadonlySet<string>)) =>
        setSelection((current) => {
            const base = current.key === query ? current.ids : EMPTY_SET
            return { key: query, ids: typeof update === "function" ? update(base) : update }
        })
    const items = data?.items ?? []
    const allSelected = items.length > 0 && items.every((lead) => selected.has(lead._id))
    const someSelected = !allSelected && items.some((lead) => selected.has(lead._id))

    const toggle = (id: string, checked: boolean) =>
        setSelected((current) => {
            const next = new Set(current)
            if (checked) next.add(id)
            else next.delete(id)
            return next
        })

    const [confirm, setConfirm] = useState<BulkAction | null>(null)

    const bulk = useMutation({
        mutationFn: async (action: BulkAction) => {
            const ids = [...selected].slice(0, LEAD_LIMITS.bulkMax)
            if (action === "read" || action === "unread") return adminFetch("/api/lead/mark-read", { method: "PUT", body: { ids, isRead: action === "read" } })
            if (action === "trash") return adminFetch("/api/lead/delete", { method: "PUT", body: { ids, deleteType: "SD" } })
            if (action === "restore") return adminFetch("/api/lead/delete", { method: "PUT", body: { ids, deleteType: "RSD" } })
            return adminFetch("/api/lead/delete", { method: "DELETE", body: { ids, deleteType: "PD" } })
        },
        onSuccess: (result) => {
            toast.success(result.message)
            setSelected(new Set())
            setConfirm(null)
        },
        onError: (err) => toast.error(err instanceof ApiError ? err.message : "That didn't work. Please try again."),
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.leads })
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.stats })
            queryClient.invalidateQueries({ queryKey: ["lead"] })
        },
    })

    const runBulk = (action: BulkAction) => (BULK_CONFIRM[action] ? setConfirm(action) : bulk.mutate(action))

    const [exporting, setExporting] = useState(false)
    const exportCsv = async () => {
        if (exporting) return
        setExporting(true)
        try {
            const ids = selected.size ? `&ids=${[...selected].join(",")}` : ""
            const res = await fetch(`/api/lead/export?${query}${ids}`, { credentials: "same-origin", cache: "no-store" })
            if (res.status === 401) {
                await adminFetch("/api/auth/me").catch(() => undefined) // triggers the sign-in redirect
                return
            }
            if (!res.ok) {
                const body = await res.json().catch(() => null)
                throw new Error(body?.message ?? "Export failed.")
            }
            const blob = await res.blob()
            const name = /filename="([^"]+)"/.exec(res.headers.get("content-disposition") ?? "")?.[1] ?? "leads.csv"
            const url = URL.createObjectURL(blob)
            const anchor = Object.assign(document.createElement("a"), { href: url, download: name })
            document.body.append(anchor)
            anchor.click()
            anchor.remove()
            window.setTimeout(() => URL.revokeObjectURL(url), 1000)
        } catch (err) {
            toast.error((err as Error).message || "Export failed.")
        } finally {
            setExporting(false)
        }
    }

    const clearFilters = () => {
        setSearch("")
        setParams(Object.fromEntries(FILTER_KEYS.map((key) => [key, null])))
    }

    const from = data && data.total ? (data.page - 1) * data.size + 1 : 0
    const to = data ? Math.min(data.page * data.size, data.total) : 0
    const confirmConfig = confirm ? BULK_CONFIRM[confirm] : null

    return (
        <div className="flex flex-col gap-4">
            {/* Toolbar: search + filters, or the selection bar */}
            {selected.size > 0 ? (
                <div className="flex min-h-11 flex-wrap items-center gap-2 rounded-xl border border-border bg-background px-3 py-2">
                    <span className="mr-auto text-sm font-medium">{selected.size} selected</span>
                    {view === "inbox" ? (
                        <>
                            <Button size="sm" variant="outline" disabled={bulk.isPending} onClick={() => runBulk("read")}>
                                <MailOpenIcon /> Mark read
                            </Button>
                            <Button size="sm" variant="outline" disabled={bulk.isPending} onClick={() => runBulk("unread")}>
                                <MailIcon /> Mark unread
                            </Button>
                            <Button size="sm" variant="outline" disabled={exporting} onClick={exportCsv}>
                                <DownloadIcon /> Export
                            </Button>
                            <Button size="sm" variant="destructive" disabled={bulk.isPending} onClick={() => runBulk("trash")}>
                                <Trash2Icon /> Trash
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button size="sm" variant="outline" disabled={bulk.isPending} onClick={() => runBulk("restore")}>
                                <ArchiveRestoreIcon /> Restore
                            </Button>
                            <Button size="sm" variant="destructive" disabled={bulk.isPending} onClick={() => runBulk("purge")}>
                                <Trash2Icon /> Delete forever
                            </Button>
                        </>
                    )}
                    <Button size="icon-sm" variant="ghost" aria-label="Clear selection" onClick={() => setSelected(new Set())}>
                        <XIcon />
                    </Button>
                </div>
            ) : (
                <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
                    <div className="relative lg:max-w-xs lg:flex-1">
                        <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                        <Input
                            type="search"
                            value={search}
                            onChange={(event) => setSearch(event.target.value.slice(0, LEAD_LIMITS.searchMax))}
                            onKeyDown={(event) => event.key === "Escape" && setSearch("")}
                            placeholder="Search name, email, ref, message…"
                            aria-label="Search leads"
                            className="bg-background pl-8"
                        />
                        {isFetching && search.trim() !== urlQ && (
                            <Loader2Icon className="absolute top-1/2 right-2.5 size-4 -translate-y-1/2 animate-spin text-muted-foreground" aria-hidden />
                        )}
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:flex lg:flex-1">
                        <NativeSelect aria-label="Status" value={status} onChange={(e) => setParams({ status: e.target.value })} className="bg-background">
                            <option value="">All statuses</option>
                            {LEAD_STATUSES.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </NativeSelect>
                        <NativeSelect aria-label="Topic" value={type} onChange={(e) => setParams({ type: e.target.value })} className="bg-background">
                            <option value="">All topics</option>
                            {INQUIRY_TYPES.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </NativeSelect>
                        <NativeSelect aria-label="Read state" value={read} onChange={(e) => setParams({ read: e.target.value })} className="bg-background">
                            <option value="">Read & unread</option>
                            <option value="unread">Unread only</option>
                            <option value="read">Read only</option>
                        </NativeSelect>
                        <NativeSelect aria-label="Sort" value={sort} onChange={(e) => setParams({ sort: e.target.value })} className="bg-background">
                            {LEAD_SORTS.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </NativeSelect>
                    </div>
                    <div className="flex gap-2">
                        {hasFilters && (
                            <Button variant="ghost" onClick={clearFilters}>
                                Clear filters
                            </Button>
                        )}
                        <Button variant="outline" className="bg-background" disabled={exporting || !data?.total} onClick={exportCsv}>
                            {exporting ? <Loader2Icon className="animate-spin" /> : <DownloadIcon />} Export CSV
                        </Button>
                    </div>
                </div>
            )}

            <div className="relative overflow-hidden rounded-xl border border-border bg-background">
                {/* Thin progress bar while a page/filter change loads. */}
                {isFetching && !isPending && <div className="absolute inset-x-0 top-0 h-0.5 animate-pulse bg-foreground/60" aria-hidden />}

                {isPending ? (
                    <div className="divide-y divide-border">
                        {Array.from({ length: 6 }, (_, index) => (
                            <div key={index} className="flex items-center gap-4 p-4">
                                <Skeleton className="size-4" />
                                <Skeleton className="h-4 w-40" />
                                <Skeleton className="hidden h-4 flex-1 md:block" />
                                <Skeleton className="h-5 w-20 rounded-full" />
                            </div>
                        ))}
                    </div>
                ) : isError && !data ? (
                    <AdminEmptyState
                        icon={TriangleAlertIcon}
                        tone="danger"
                        title="Couldn't load leads"
                        description={error instanceof ApiError ? error.message : "Please try again."}
                        action={{ label: "Retry", onClick: () => refetch() }}
                    />
                ) : !items.length ? (
                    hasFilters ? (
                        <AdminEmptyState
                            icon={SearchXIcon}
                            title="No matches"
                            description="No leads match these filters."
                            action={{ label: "Clear filters", onClick: clearFilters }}
                        />
                    ) : view === "trash" ? (
                        <AdminEmptyState icon={Trash2Icon} title="Trash is empty" description="Leads you move to the trash appear here." />
                    ) : (
                        <AdminEmptyState icon={InboxIcon} title="No leads yet" description="Messages from the contact form will appear here." />
                    )
                ) : (
                    <>
                        {/* Desktop table */}
                        <Table className="hidden md:table">
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-10 pl-4">
                                        <Checkbox
                                            checked={allSelected}
                                            indeterminate={someSelected}
                                            onCheckedChange={(checked) => setSelected(checked ? new Set(items.map((lead) => lead._id)) : new Set())}
                                            aria-label="Select all on this page"
                                        />
                                    </TableHead>
                                    <TableHead>From</TableHead>
                                    <TableHead>Topic</TableHead>
                                    <TableHead className="w-[38%]">Message</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="pr-4 text-right">{view === "trash" ? "Trashed" : "Received"}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {items.map((lead) => (
                                    <LeadRow key={lead._id} lead={lead} view={view} checked={selected.has(lead._id)} onCheck={toggle} />
                                ))}
                            </TableBody>
                        </Table>

                        {/* Phone cards */}
                        <ul className="divide-y divide-border md:hidden">
                            {items.map((lead) => (
                                <li key={lead._id} className="flex gap-3 p-4">
                                    <Checkbox
                                        className="mt-1"
                                        checked={selected.has(lead._id)}
                                        onCheckedChange={(checked) => toggle(lead._id, checked)}
                                        aria-label={`Select ${lead.name}`}
                                    />
                                    <Link href={ADMIN_LEAD_DETAILS(lead._id)} className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            {!lead.isRead && <span className="size-2 shrink-0 rounded-full bg-sky-500" aria-label="Unread" />}
                                            <span className={cn("truncate", !lead.isRead && "font-semibold")}>{lead.name}</span>
                                            <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                                                {formatRelative(view === "trash" ? lead.deletedAt : lead.createdAt)}
                                            </span>
                                        </div>
                                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                            {inquiryLabel(lead.inquiryType)} · {lead.email}
                                        </p>
                                        <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">{lead.message}</p>
                                        <LeadStatusBadge status={lead.status} className="mt-2" />
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </>
                )}
            </div>

            {data && data.total > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                    <p className="text-muted-foreground" aria-live="polite">
                        Showing {from}–{to} of {data.total}
                    </p>
                    <div className="flex items-center gap-2">
                        <label className="flex items-center gap-2 text-muted-foreground">
                            <span className="hidden sm:inline">Rows</span>
                            <NativeSelect value={String(size)} onChange={(e) => setParams({ size: Number(e.target.value) })} className="h-8 w-20 bg-background">
                                {PAGE_SIZES.map((value) => (
                                    <option key={value} value={value}>
                                        {value}
                                    </option>
                                ))}
                            </NativeSelect>
                        </label>
                        <Button
                            size="icon-sm"
                            variant="outline"
                            aria-label="Previous page"
                            disabled={data.page <= 1 || isFetching}
                            onClick={() => setParams({ page: data.page - 1 }, false)}
                        >
                            <ChevronLeftIcon />
                        </Button>
                        <span className="min-w-16 text-center font-mono text-xs">
                            {data.page} / {data.pageCount}
                        </span>
                        <Button
                            size="icon-sm"
                            variant="outline"
                            aria-label="Next page"
                            disabled={data.page >= data.pageCount || isFetching}
                            onClick={() => setParams({ page: data.page + 1 }, false)}
                        >
                            <ChevronRightIcon />
                        </Button>
                    </div>
                </div>
            )}

            {confirmConfig && (
                <ConfirmDialog
                    open
                    onOpenChange={(open) => !open && setConfirm(null)}
                    title={confirmConfig.title}
                    description={confirmConfig.description(selected.size)}
                    confirmLabel={confirmConfig.label}
                    destructive={confirmConfig.destructive}
                    pending={bulk.isPending}
                    onConfirm={() => confirm && bulk.mutate(confirm)}
                />
            )}
        </div>
    )
}

function LeadRow({ lead, view, checked, onCheck }: { lead: LeadDTO; view: View; checked: boolean; onCheck: (id: string, checked: boolean) => void }) {
    const router = useRouter()
    const href = ADMIN_LEAD_DETAILS(lead._id)
    const when = view === "trash" ? lead.deletedAt : lead.createdAt

    return (
        <TableRow
            data-state={checked ? "selected" : undefined}
            className="cursor-pointer"
            // Whole row opens the lead; the name is also a real link for
            // keyboard users, middle-click and "open in new tab".
            onClick={(event) => {
                if ((event.target as HTMLElement).closest("a,button,[role=checkbox]")) return
                if (event.metaKey || event.ctrlKey) window.open(href, "_blank")
                else router.push(href)
            }}
        >
            <TableCell className="pl-4">
                <Checkbox checked={checked} onCheckedChange={(value) => onCheck(lead._id, value)} aria-label={`Select ${lead.name}`} />
            </TableCell>
            <TableCell className="max-w-56">
                <div className="flex items-center gap-2">
                    {!lead.isRead && <span className="size-2 shrink-0 rounded-full bg-sky-500" aria-label="Unread" />}
                    <Link href={href} className={cn("truncate hover:underline", !lead.isRead && "font-semibold")}>
                        {lead.name}
                    </Link>
                </div>
                <p className="truncate text-xs text-muted-foreground">{lead.email}</p>
            </TableCell>
            <TableCell className="text-muted-foreground">{inquiryLabel(lead.inquiryType)}</TableCell>
            <TableCell className="max-w-0">
                <p className="truncate text-muted-foreground">{lead.message}</p>
            </TableCell>
            <TableCell>
                <LeadStatusBadge status={lead.status} />
            </TableCell>
            <TableCell className="pr-4 text-right whitespace-nowrap text-muted-foreground">
                <time dateTime={when ?? undefined} title={formatDateTime(when)}>
                    {formatRelative(when)}
                </time>
            </TableCell>
        </TableRow>
    )
}
