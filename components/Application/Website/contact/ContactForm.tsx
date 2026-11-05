"use client"

import { useEffect, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { CheckCircle2Icon, CopyIcon, Loader2Icon } from "lucide-react"
import { toast } from "sonner"
import { ApiError, apiFetch } from "@/lib/apiClient"
import { LEAD_LIMITS, SOURCE_DEFAULT_TYPE, inquiryLabel, isLeadSource, type LeadSource } from "@/lib/leadConfig"
import { cn } from "@/lib/utils"
import { leadFormSchema, type LeadFormInput, type LeadFormValues } from "@/lib/zodSchema"

const DRAFT_KEY = "mx:contact-draft"
const EMPTY = { name: "", organisation: "", email: "", message: "" }

type Draft = Partial<typeof EMPTY>

const readDraft = (): Draft | null => {
    try {
        const raw = sessionStorage.getItem(DRAFT_KEY)
        return raw ? (JSON.parse(raw) as Draft) : null
    } catch {
        return null
    }
}

// Underlined fields on the dark section, as in the design.
const labelClass = "block text-sm font-medium text-white"
const fieldClass =
    "mt-2 block h-10 w-full border-b border-white/25 bg-transparent text-sm text-white outline-none transition-colors placeholder:text-mx-slate/70 focus:border-mx-lilac aria-invalid:border-red-400"
const errorClass = "mt-1.5 text-xs text-red-300"

const ContactForm = () => {
    const searchParams = useSearchParams()
    const forParam = searchParams.get("for")
    const source: LeadSource | undefined = isLeadSource(forParam) ? forParam : undefined

    const [submitting, setSubmitting] = useState(false)
    const [formError, setFormError] = useState<string | null>(null)
    const [ticketId, setTicketId] = useState<string | null>(null)
    // Measured with performance.now(): a duration, immune to device clock skew.
    const openedAt = useRef(0)
    const honeypot = useRef<HTMLInputElement>(null)

    const form = useForm<LeadFormInput, unknown, LeadFormValues>({
        resolver: zodResolver(leadFormSchema),
        defaultValues: EMPTY,
        mode: "onTouched",
    })
    const { register, handleSubmit, formState, control, reset, setError } = form
    const messageLength = (useWatch({ control, name: "message" }) ?? "").length

    // Restore an unsent draft (accidental reload / back button).
    useEffect(() => {
        openedAt.current = performance.now()
        const draft = readDraft()
        if (draft) reset({ ...EMPTY, ...draft })
    }, [reset])

    // Keep the draft in this tab's sessionStorage (cleared on success or when
    // the tab closes — never persisted across browser sessions).
    useEffect(
        () =>
            form.subscribe({
                formState: { values: true },
                callback: ({ values }) => {
                    try {
                        const hasContent = Object.values(values ?? {}).some((value) => typeof value === "string" && value.trim())
                        if (hasContent) sessionStorage.setItem(DRAFT_KEY, JSON.stringify(values))
                        else sessionStorage.removeItem(DRAFT_KEY)
                    } catch {
                        // Private mode / storage full: drafts are a nicety, not required.
                    }
                },
            }),
        [form]
    )

    const onSubmit = async (values: LeadFormValues) => {
        if (submitting) return
        setSubmitting(true)
        setFormError(null)
        try {
            const { data } = await apiFetch<{ ticketId: string }>("/api/lead", {
                method: "POST",
                body: {
                    ...values,
                    // The topic comes from the practice area link they followed.
                    inquiryType: source ? SOURCE_DEFAULT_TYPE[source] : values.inquiryType,
                    source,
                    website: honeypot.current?.value ?? "",
                    elapsedMs: Math.round(performance.now() - openedAt.current),
                },
            })
            try {
                sessionStorage.removeItem(DRAFT_KEY)
            } catch {}
            setTicketId(data.ticketId)
            reset(EMPTY)
        } catch (error) {
            if (error instanceof ApiError) {
                for (const [field, message] of Object.entries(error.fields)) {
                    if (field in EMPTY) setError(field as keyof typeof EMPTY, { message }, { shouldFocus: true })
                }
                setFormError(
                    Object.keys(error.fields).length
                        ? "Please check the highlighted fields."
                        : `${error.message}${error.status === 0 ? " Your message is still here." : ""}`
                )
            } else {
                setFormError("Something went wrong. Your message is still here — please try again.")
            }
        } finally {
            setSubmitting(false)
        }
    }

    if (ticketId) {
        return (
            <div className="mt-8 flex flex-col items-start gap-5 rounded-2xl border border-white/15 p-6 sm:p-8" role="status">
                <CheckCircle2Icon className="size-8 text-mx-lilac" aria-hidden />
                <div>
                    <p className="text-2xl tracking-[-0.025em]">Message received.</p>
                    <p className="mt-2 text-mx-slate">Thank you for reaching out. You&apos;ll hear back by email soon.</p>
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2">
                    <span className="text-sm text-mx-slate">Reference</span>
                    <span className="font-mono text-sm font-semibold">{ticketId}</span>
                    <button
                        type="button"
                        className="ml-1 rounded p-1 text-mx-slate hover:text-white"
                        aria-label="Copy reference"
                        onClick={() =>
                            navigator.clipboard
                                ?.writeText(ticketId)
                                .then(() => toast.success("Reference copied."))
                                .catch(() => toast.error("Couldn't copy — select it instead."))
                        }
                    >
                        <CopyIcon className="size-4" />
                    </button>
                </div>
                <button
                    type="button"
                    className="text-sm font-medium text-mx-lilac underline underline-offset-4 hover:text-white"
                    onClick={() => {
                        setTicketId(null)
                        openedAt.current = performance.now()
                    }}
                >
                    Send another message
                </button>
            </div>
        )
    }

    return (
        <form onSubmit={(event) => handleSubmit(onSubmit)(event)} noValidate className="relative mt-8 flex flex-col gap-7" aria-busy={submitting}>
            {source && source !== "contact" && (
                <p className="text-sm text-mx-sky">Regarding: {inquiryLabel(SOURCE_DEFAULT_TYPE[source])}</p>
            )}

            <div className="grid gap-7 sm:grid-cols-2">
                <div>
                    <label htmlFor="name" className={labelClass}>
                        Your name
                    </label>
                    <input id="name" autoComplete="name" placeholder="Full name" maxLength={LEAD_LIMITS.nameMax} aria-invalid={Boolean(formState.errors.name)} className={fieldClass} {...register("name")} />
                    {formState.errors.name && <p className={errorClass}>{formState.errors.name.message}</p>}
                </div>
                <div>
                    <label htmlFor="organisation" className={labelClass}>
                        Organisation
                    </label>
                    <input
                        id="organisation"
                        autoComplete="organization"
                        placeholder="Company or institution"
                        maxLength={LEAD_LIMITS.organisationMax}
                        aria-invalid={Boolean(formState.errors.organisation)}
                        className={fieldClass}
                        {...register("organisation")}
                    />
                    {formState.errors.organisation && <p className={errorClass}>{formState.errors.organisation.message}</p>}
                </div>
            </div>

            <div>
                <label htmlFor="email" className={labelClass}>
                    Email address
                </label>
                <input
                    id="email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="you@organisation.com"
                    maxLength={LEAD_LIMITS.emailMax}
                    aria-invalid={Boolean(formState.errors.email)}
                    className={fieldClass}
                    {...register("email")}
                />
                {formState.errors.email && <p className={errorClass}>{formState.errors.email.message}</p>}
            </div>

            <div>
                <div className="flex items-baseline justify-between gap-2">
                    <label htmlFor="message" className={labelClass}>
                        How can we help?
                    </label>
                    <span className={cn("text-xs", messageLength > LEAD_LIMITS.messageMax ? "text-red-300" : "text-mx-slate")} aria-live="polite">
                        {messageLength}/{LEAD_LIMITS.messageMax}
                    </span>
                </div>
                <textarea
                    id="message"
                    rows={5}
                    placeholder="Tell us about your challenge or advisory need..."
                    aria-invalid={Boolean(formState.errors.message)}
                    data-lenis-prevent
                    className="mt-2 block min-h-36 w-full rounded-lg border border-white/25 bg-transparent p-4 text-sm text-white outline-none transition-colors placeholder:text-mx-slate/70 focus:border-mx-lilac aria-invalid:border-red-400"
                    {...register("message")}
                />
                {formState.errors.message && <p className={errorClass}>{formState.errors.message.message}</p>}
            </div>

            {/* Honeypot: hidden from people and assistive tech; bots fill it. */}
            <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
                <label htmlFor="website">Website</label>
                <input ref={honeypot} id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
            </div>

            {formError && (
                <p role="alert" className="rounded-lg bg-red-500/15 px-3 py-2 text-sm text-red-200">
                    {formError}
                </p>
            )}

            <button
                type="submit"
                disabled={submitting}
                className="flex h-14 w-full items-center justify-center gap-2 rounded-lg bg-white font-medium text-mx-navy transition-colors hover:bg-mx-mist focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-70"
            >
                {submitting && <Loader2Icon className="size-4 animate-spin" aria-hidden />}
                {submitting ? "Sending…" : "Send us an email"}
            </button>
        </form>
    )
}

export default ContactForm
