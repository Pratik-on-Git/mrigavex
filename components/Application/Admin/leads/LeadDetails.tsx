"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
    ArchiveRestoreIcon,
    ArrowLeftIcon,
    CopyIcon,
    FileQuestionIcon,
    Loader2Icon,
    MailIcon,
    MessageCircleIcon,
    PhoneIcon,
    Trash2Icon,
    TriangleAlertIcon,
} from "lucide-react"
import { toast } from "sonner"
import AdminEmptyState from "@/components/Application/Admin/AdminEmptyState"
import ConfirmDialog from "@/components/Application/Admin/ConfirmDialog"
import PageHeader from "@/components/Application/Admin/PageHeader"
import LeadStatusBadge from "@/components/Application/Admin/leads/LeadStatusBadge"
import { Button, buttonVariants } from "@/components/ui/button"
import { NativeSelect } from "@/components/ui/native-select"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import useUnsavedChanges from "@/hooks/useUnsavedChanges"
import { QUERY_KEYS, fetchLead, type LeadDTO } from "@/lib/adminQueries"
import { ApiError, adminFetch } from "@/lib/apiClient"
import { formatDateTime, formatRelative, telLink, whatsappLink } from "@/lib/format"
import { LEAD_LIMITS, LEAD_STATUSES, inquiryLabel, statusMeta, type LeadStatus } from "@/lib/leadConfig"
import { cn } from "@/lib/utils"
import { ADMIN_DASHBOARD, ADMIN_LEADS_SHOW, ADMIN_TRASH_OF } from "@/routes/AdminPanelRoute"

const copy = (text: string, label: string) =>
    navigator.clipboard
        ?.writeText(text)
        .then(() => toast.success(`${label} copied.`))
        .catch(() => toast.error("Couldn't copy."))

export default function LeadDetails({ id }: { id: string }) {
    const queryClient = useQueryClient()
    const { data: lead, isPending, error, refetch } = useQuery({
        queryKey: QUERY_KEYS.lead(id),
        queryFn: () => fetchLead(id),
        // Never silently replace the record under an open editor; conflicts
        // are detected on save instead.
        refetchOnWindowFocus: false,
    })

    // Opening marks it read on the server: refresh the badge and the list.
    useEffect(() => {
        if (!lead) return
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.stats })
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.leads })
    }, [lead?._id, queryClient]) // eslint-disable-line react-hooks/exhaustive-deps

    const crumbs = [
        { href: ADMIN_DASHBOARD, label: "Dashboard" },
        { href: ADMIN_LEADS_SHOW, label: "Leads" },
        { label: lead?.ticketId ?? "Lead" },
    ]

    if (isPending) {
        return (
            <div className="flex flex-col gap-6">
                <PageHeader title="Lead" breadcrumb={crumbs} />
                <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
                    <Skeleton className="h-96 rounded-xl" />
                    <Skeleton className="h-72 rounded-xl" />
                </div>
            </div>
        )
    }

    if (error || !lead) {
        const missing = error instanceof ApiError && error.status === 404
        return (
            <div className="flex flex-col gap-6">
                <PageHeader title="Lead" breadcrumb={crumbs} />
                <div className="rounded-xl border border-border bg-background">
                    <AdminEmptyState
                        icon={missing ? FileQuestionIcon : TriangleAlertIcon}
                        tone="danger"
                        title={missing ? "Lead not found" : "Couldn't load this lead"}
                        description={missing ? "It may have been deleted permanently." : error instanceof ApiError ? error.message : "Please try again."}
                        action={missing ? { label: "Back to leads", href: ADMIN_LEADS_SHOW } : { label: "Retry", onClick: () => refetch() }}
                    />
                </div>
            </div>
        )
    }

    // Keyed by updatedAt so a reload after a conflict resets the editor.
    return <LeadView key={lead.updatedAt} lead={lead} crumbs={crumbs} />
}

function LeadView({ lead, crumbs }: { lead: LeadDTO; crumbs: { href?: string; label: string }[] }) {
    const router = useRouter()
    const queryClient = useQueryClient()
    const trashed = Boolean(lead.deletedAt)

    const [status, setStatus] = useState<LeadStatus>(lead.status)
    const [notes, setNotes] = useState(lead.adminNotes)
    const [conflict, setConflict] = useState(false)
    const dirty = status !== lead.status || notes !== lead.adminNotes
    useUnsavedChanges(dirty)

    const invalidateAll = () => {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.leads })
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.stats })
    }

    const save = useMutation({
        mutationFn: () =>
            adminFetch<LeadDTO>("/api/lead/update", {
                method: "PUT",
                body: {
                    _id: lead._id,
                    updatedAt: lead.updatedAt,
                    ...(status !== lead.status ? { status } : {}),
                    ...(notes !== lead.adminNotes ? { adminNotes: notes } : {}),
                },
            }),
        onSuccess: ({ message, data }) => {
            toast.success(message)
            queryClient.setQueryData(QUERY_KEYS.lead(lead._id), data)
            invalidateAll()
        },
        onError: (err) => {
            if (err instanceof ApiError && err.status === 409) setConflict(true)
            toast.error(err instanceof ApiError ? err.message : "Couldn't save.")
        },
    })

    const [confirm, setConfirm] = useState<"trash" | "purge" | null>(null)
    const lifecycle = useMutation({
        mutationFn: (action: "trash" | "restore" | "purge") =>
            action === "purge"
                ? adminFetch("/api/lead/delete", { method: "DELETE", body: { ids: [lead._id], deleteType: "PD" } })
                : adminFetch("/api/lead/delete", { method: "PUT", body: { ids: [lead._id], deleteType: action === "trash" ? "SD" : "RSD" } }),
        onSuccess: ({ message }, action) => {
            toast.success(message)
            setConfirm(null)
            invalidateAll()
            if (action === "purge") {
                queryClient.removeQueries({ queryKey: QUERY_KEYS.lead(lead._id) })
                router.replace(ADMIN_TRASH_OF("leads"))
            } else {
                queryClient.invalidateQueries({ queryKey: QUERY_KEYS.lead(lead._id) })
                if (action === "trash") router.push(ADMIN_LEADS_SHOW)
            }
        },
        onError: (err) => toast.error(err instanceof ApiError ? err.message : "That didn't work."),
    })

    const reloadLatest = () => {
        setConflict(false)
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.lead(lead._id) })
    }

    const tel = lead.phone ? telLink(lead.phone) : null
    const whatsapp = lead.phone ? whatsappLink(lead.phone) : null
    const replySubject = encodeURIComponent(`Re: your enquiry (${lead.ticketId})`)
    const history = [...lead.statusHistory].reverse()

    return (
        <div className="flex flex-col gap-6">
            <PageHeader
                title={lead.name}
                description={`${lead.ticketId} · ${inquiryLabel(lead.inquiryType)} · received ${formatDateTime(lead.createdAt)}`}
                breadcrumb={crumbs}
                actions={
                    trashed ? (
                        <>
                            <Button variant="outline" disabled={lifecycle.isPending} onClick={() => lifecycle.mutate("restore")}>
                                <ArchiveRestoreIcon /> Restore
                            </Button>
                            <Button variant="destructive" disabled={lifecycle.isPending} onClick={() => setConfirm("purge")}>
                                <Trash2Icon /> Delete forever
                            </Button>
                        </>
                    ) : (
                        <>
                            <Link href={ADMIN_LEADS_SHOW} className={cn(buttonVariants({ variant: "ghost" }))}>
                                <ArrowLeftIcon /> Leads
                            </Link>
                            <Button variant="outline" disabled={lifecycle.isPending} onClick={() => setConfirm("trash")}>
                                <Trash2Icon /> Move to trash
                            </Button>
                        </>
                    )
                }
            />

            {trashed && (
                <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
                    This lead is in the trash (since {formatDateTime(lead.deletedAt)}). Restore it to edit its status or notes.
                </p>
            )}

            <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
                <div className="flex flex-col gap-6">
                    <section className="rounded-xl border border-border bg-background p-5 sm:p-6" aria-labelledby="message-heading">
                        <h2 id="message-heading" className="mb-3 text-sm font-semibold">
                            Message
                        </h2>
                        <p className="text-[15px] leading-relaxed break-words whitespace-pre-wrap">{lead.message}</p>
                    </section>

                    <section className="rounded-xl border border-border bg-background p-5 sm:p-6" aria-labelledby="manage-heading">
                        <h2 id="manage-heading" className="mb-4 text-sm font-semibold">
                            Status &amp; notes
                        </h2>

                        {conflict && (
                            <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
                                <span className="flex-1">This lead was changed in another tab or device. Your edits are still here.</span>
                                <Button size="sm" variant="outline" onClick={reloadLatest}>
                                    Reload latest (discard edits)
                                </Button>
                            </div>
                        )}

                        <fieldset disabled={trashed || save.isPending} className="flex flex-col gap-4">
                            <label className="flex flex-col gap-1.5">
                                <span className="text-sm font-medium">Status</span>
                                <NativeSelect value={status} onChange={(e) => setStatus(e.target.value as LeadStatus)} className="sm:max-w-xs">
                                    {LEAD_STATUSES.map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </NativeSelect>
                                <span className="text-xs text-muted-foreground">{statusMeta(status).description}</span>
                            </label>

                            <label className="flex flex-col gap-1.5">
                                <span className="flex items-baseline justify-between text-sm font-medium">
                                    Private notes
                                    <span className={cn("text-xs font-normal", notes.length > LEAD_LIMITS.notesMax ? "text-destructive" : "text-muted-foreground")}>
                                        {notes.length}/{LEAD_LIMITS.notesMax}
                                    </span>
                                </span>
                                <Textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    rows={5}
                                    className="min-h-28"
                                    placeholder="Quotes, call notes, next steps — only you see these."
                                />
                            </label>

                            <div className="flex flex-wrap items-center gap-2">
                                <Button disabled={!dirty || save.isPending || notes.length > LEAD_LIMITS.notesMax} onClick={() => save.mutate()}>
                                    {save.isPending && <Loader2Icon className="animate-spin" />}
                                    Save changes
                                </Button>
                                {dirty && (
                                    <Button
                                        variant="ghost"
                                        onClick={() => {
                                            setStatus(lead.status)
                                            setNotes(lead.adminNotes)
                                        }}
                                    >
                                        Discard
                                    </Button>
                                )}
                                {dirty && <span className="text-xs text-muted-foreground">Unsaved changes</span>}
                            </div>
                        </fieldset>
                    </section>
                </div>

                <div className="flex flex-col gap-6">
                    <section className="rounded-xl border border-border bg-background p-5" aria-labelledby="contact-heading">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 id="contact-heading" className="text-sm font-semibold">
                                Contact
                            </h2>
                            <LeadStatusBadge status={lead.status} />
                        </div>
                        <dl className="flex flex-col gap-3 text-sm">
                            <Detail label="Email">
                                <span className="break-all">{lead.email}</span>
                                <IconButton label="Copy email" onClick={() => copy(lead.email, "Email")} />
                            </Detail>
                            <Detail label="Organisation">{lead.organisation || <span className="text-muted-foreground">Not given</span>}</Detail>
                            {/* The public form doesn't ask for a phone; older or API leads may have one. */}
                            {lead.phone && <Detail label="Phone">{lead.phone}</Detail>}
                            <Detail label="Reference">
                                <span className="font-mono">{lead.ticketId}</span>
                                <IconButton label="Copy reference" onClick={() => copy(lead.ticketId, "Reference")} />
                            </Detail>
                            <Detail label="From link">{lead.source || "—"}</Detail>
                        </dl>
                        <div className="mt-5 grid gap-2">
                            <a href={`mailto:${lead.email}?subject=${replySubject}`} className={cn(buttonVariants())}>
                                <MailIcon /> Reply by email
                            </a>
                            {(tel || whatsapp) && (
                                <div className="grid grid-cols-2 gap-2">
                                    {tel && (
                                        <a href={tel} className={cn(buttonVariants({ variant: "outline" }))}>
                                            <PhoneIcon /> Call
                                        </a>
                                    )}
                                    {whatsapp && (
                                        <a href={whatsapp} target="_blank" rel="noopener noreferrer" className={cn(buttonVariants({ variant: "outline" }))}>
                                            <MessageCircleIcon /> WhatsApp
                                        </a>
                                    )}
                                </div>
                            )}
                        </div>
                        {lead.notifyError && !lead.notifiedAt && (
                            <p className="mt-4 rounded-lg bg-amber-500/10 px-3 py-2 text-xs">
                                The email alert for this lead couldn&apos;t be sent ({lead.notifyError}). Check the mail settings.
                            </p>
                        )}
                    </section>

                    <section className="rounded-xl border border-border bg-background p-5" aria-labelledby="history-heading">
                        <h2 id="history-heading" className="mb-4 text-sm font-semibold">
                            History
                        </h2>
                        <ol className="flex flex-col gap-3 text-sm">
                            {history.map((entry, index) => (
                                <li key={`${entry.status}-${entry.at}-${index}`} className="flex items-center justify-between gap-3">
                                    <LeadStatusBadge status={entry.status} />
                                    <time dateTime={entry.at} title={formatDateTime(entry.at)} className="text-xs text-muted-foreground">
                                        {formatRelative(entry.at)}
                                    </time>
                                </li>
                            ))}
                            {lead.readAt && (
                                <li className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                                    <span>First opened</span>
                                    <time dateTime={lead.readAt}>{formatDateTime(lead.readAt)}</time>
                                </li>
                            )}
                        </ol>
                    </section>
                </div>
            </div>

            {confirm && (
                <ConfirmDialog
                    open
                    onOpenChange={(open) => !open && setConfirm(null)}
                    title={confirm === "purge" ? "Delete permanently?" : "Move to trash?"}
                    description={
                        confirm === "purge"
                            ? `${lead.name}'s lead (${lead.ticketId}) will be deleted forever. This can't be undone.`
                            : `${lead.name}'s lead will move to the trash. You can restore it from there.`
                    }
                    confirmLabel={confirm === "purge" ? "Delete forever" : "Move to trash"}
                    destructive={confirm === "purge"}
                    pending={lifecycle.isPending}
                    onConfirm={() => lifecycle.mutate(confirm)}
                />
            )}
        </div>
    )
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="flex flex-col gap-0.5">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="flex items-center gap-1.5">{children}</dd>
        </div>
    )
}

function IconButton({ label, onClick }: { label: string; onClick: () => void }) {
    return (
        <button type="button" onClick={onClick} aria-label={label} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
            <CopyIcon className="size-3.5" />
        </button>
    )
}
