"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { REGEXP_ONLY_DIGITS } from "input-otp"
import { ArrowLeftIcon, EyeIcon, EyeOffIcon, Loader2Icon, LockKeyholeIcon, MailCheckIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import { ApiError, apiFetch } from "@/lib/apiClient"
import { safeAdminCallback } from "@/lib/safeRedirect"
import { SITE } from "@/lib/site"
import { loginSchema } from "@/lib/zodSchema"
import { WEBSITE_HOME } from "@/routes/WebsiteRoute"
import type { z } from "zod"

type LoginInput = z.input<typeof loginSchema>
type LoginValues = z.output<typeof loginSchema>
type Challenge = { sentTo: string; expiresIn: number; resendAfter: number }

// Step 1: email + password → server emails a code and sets a challenge cookie.
// Step 2: 6-digit code → session cookie, then on to the page that asked.
const LoginFlow = () => {
    const searchParams = useSearchParams()
    const callback = safeAdminCallback(searchParams.get("callback"))
    const sessionExpired = searchParams.get("expired") === "1"

    const [challenge, setChallenge] = useState<Challenge | null>(null)
    const [notice, setNotice] = useState<string | null>(sessionExpired ? "Your session ended. Please sign in again." : null)

    return (
        <div className="w-full max-w-sm">
            <div className="rounded-2xl border border-border bg-background p-6 shadow-sm sm:p-8">
                {challenge ? (
                    <CodeStep
                        challenge={challenge}
                        callback={callback}
                        onRestart={(message) => {
                            setChallenge(null)
                            setNotice(message)
                        }}
                    />
                ) : (
                    <PasswordStep
                        notice={notice}
                        onChallenge={(next) => {
                            setNotice(null)
                            setChallenge(next)
                        }}
                    />
                )}
            </div>
            <Link href={WEBSITE_HOME} className="mt-6 flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
                <ArrowLeftIcon className="size-4" aria-hidden /> Back to {SITE.name}
            </Link>
        </div>
    )
}

// Remembers the email between steps (and after a restart) within this tab.
const EMAIL_KEY = "mx:admin-email"

function PasswordStep({ notice, onChallenge }: { notice: string | null; onChallenge: (challenge: Challenge) => void }) {
    const [showPassword, setShowPassword] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [formError, setFormError] = useState<string | null>(null)

    const { register, handleSubmit, formState, setValue, setFocus } = useForm<LoginInput, unknown, LoginValues>({
        resolver: zodResolver(loginSchema),
        defaultValues: { email: "", password: "" },
    })

    useEffect(() => {
        try {
            const saved = sessionStorage.getItem(EMAIL_KEY)
            if (saved) {
                setValue("email", saved)
                setFocus("password")
                return
            }
        } catch {}
        setFocus("email")
    }, [setValue, setFocus])

    const onSubmit = async (values: LoginValues) => {
        if (submitting) return
        setSubmitting(true)
        setFormError(null)
        try {
            const { data } = await apiFetch<Challenge>("/api/auth/login", { method: "POST", body: values })
            try {
                sessionStorage.setItem(EMAIL_KEY, values.email)
            } catch {}
            onChallenge(data)
        } catch (error) {
            setFormError(error instanceof ApiError ? error.message : "Sign-in failed. Please try again.")
            setValue("password", "")
            setFocus("password")
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="mb-6 flex flex-col items-center text-center">
                <span className="mb-4 flex size-11 items-center justify-center rounded-full bg-muted">
                    <LockKeyholeIcon className="size-5" aria-hidden />
                </span>
                <h1 className="text-xl font-semibold tracking-tight">Admin sign in</h1>
                <p className="mt-1 text-sm text-muted-foreground">Private area for the site owner.</p>
            </div>

            {notice && (
                <p role="status" className="mb-4 rounded-lg bg-muted px-3 py-2 text-sm">
                    {notice}
                </p>
            )}

            <FieldGroup className="gap-4">
                <Field data-invalid={Boolean(formState.errors.email)}>
                    <FieldLabel htmlFor="email">Email</FieldLabel>
                    <Input id="email" type="email" autoComplete="username" inputMode="email" aria-invalid={Boolean(formState.errors.email)} {...register("email")} />
                    <FieldError errors={[formState.errors.email]} />
                </Field>
                <Field data-invalid={Boolean(formState.errors.password)}>
                    <FieldLabel htmlFor="password">Password</FieldLabel>
                    <div className="relative">
                        <Input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            autoComplete="current-password"
                            className="pr-10"
                            aria-invalid={Boolean(formState.errors.password)}
                            {...register("password")}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword((value) => !value)}
                            className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground hover:text-foreground"
                            aria-label={showPassword ? "Hide password" : "Show password"}
                            aria-pressed={showPassword}
                        >
                            {showPassword ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
                        </button>
                    </div>
                    <FieldError errors={[formState.errors.password]} />
                </Field>

                {formError && (
                    <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                        {formError}
                    </p>
                )}

                <Button type="submit" size="lg" disabled={submitting} className="h-10 w-full">
                    {submitting && <Loader2Icon className="animate-spin" aria-hidden />}
                    {submitting ? "Checking…" : "Continue"}
                </Button>
            </FieldGroup>
        </form>
    )
}

function CodeStep({ challenge, callback, onRestart }: { challenge: Challenge; callback: string; onRestart: (message: string) => void }) {
    const [code, setCode] = useState("")
    const [submitting, setSubmitting] = useState(false)
    const [resending, setResending] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [info, setInfo] = useState<string | null>(null)
    const [cooldown, setCooldown] = useState(challenge.resendAfter)
    const inFlight = useRef(false)

    useEffect(() => {
        if (cooldown <= 0) return
        const timer = window.setTimeout(() => setCooldown((value) => value - 1), 1000)
        return () => window.clearTimeout(timer)
    }, [cooldown])

    const verify = async (value: string) => {
        if (inFlight.current || value.length !== 6) return
        inFlight.current = true
        setSubmitting(true)
        setError(null)
        try {
            await apiFetch("/api/auth/verify-otp", { method: "POST", body: { otp: value } })
            // Full navigation so the proxy and every server check see the new
            // session cookie from a clean slate.
            window.location.replace(callback)
        } catch (err) {
            inFlight.current = false
            setSubmitting(false)
            setCode("")
            if (err instanceof ApiError && err.data.restart) {
                onRestart(err.message)
                return
            }
            setError(err instanceof ApiError ? err.message : "Verification failed. Please try again.")
        }
    }

    const resend = async () => {
        if (resending || cooldown > 0) return
        setResending(true)
        setError(null)
        setInfo(null)
        try {
            const { message, data } = await apiFetch<{ resendAfter: number }>("/api/auth/resend-otp", { method: "POST" })
            setInfo(message)
            setCooldown(data.resendAfter)
        } catch (err) {
            if (err instanceof ApiError && err.data.restart) {
                onRestart(err.message)
                return
            }
            if (err instanceof ApiError && typeof err.data.retryAfter === "number") setCooldown(err.data.retryAfter)
            setError(err instanceof ApiError ? err.message : "Couldn't send a new code.")
        } finally {
            setResending(false)
        }
    }

    return (
        <form
            onSubmit={(event) => {
                event.preventDefault()
                verify(code)
            }}
        >
            <div className="mb-6 flex flex-col items-center text-center">
                <span className="mb-4 flex size-11 items-center justify-center rounded-full bg-muted">
                    <MailCheckIcon className="size-5" aria-hidden />
                </span>
                <h1 className="text-xl font-semibold tracking-tight">Check your email</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    Enter the 6-digit code sent to <span className="font-medium text-foreground">{challenge.sentTo}</span>. It expires in{" "}
                    {Math.round(challenge.expiresIn / 60)} minutes.
                </p>
            </div>

            <div className="flex justify-center">
                <InputOTP
                    maxLength={6}
                    pattern={REGEXP_ONLY_DIGITS}
                    value={code}
                    onChange={(value) => {
                        setCode(value)
                        if (error) setError(null)
                    }}
                    onComplete={verify}
                    disabled={submitting}
                    autoFocus
                    autoComplete="one-time-code"
                    inputMode="numeric"
                    aria-label="6-digit sign-in code"
                >
                    <InputOTPGroup>
                        {Array.from({ length: 6 }, (_, index) => (
                            <InputOTPSlot key={index} index={index} className="size-11 text-lg" aria-invalid={Boolean(error)} />
                        ))}
                    </InputOTPGroup>
                </InputOTP>
            </div>

            {error && (
                <p role="alert" className="mt-4 rounded-lg bg-destructive/10 px-3 py-2 text-center text-sm text-destructive">
                    {error}
                </p>
            )}
            {info && !error && (
                <p role="status" className="mt-4 rounded-lg bg-muted px-3 py-2 text-center text-sm">
                    {info}
                </p>
            )}

            <Button type="submit" size="lg" disabled={submitting || code.length !== 6} className="mt-6 h-10 w-full">
                {submitting && <Loader2Icon className="animate-spin" aria-hidden />}
                {submitting ? "Verifying…" : "Verify and sign in"}
            </Button>

            <div className="mt-4 flex items-center justify-between text-sm">
                <button type="button" onClick={() => onRestart("")} className="text-muted-foreground hover:text-foreground">
                    Start over
                </button>
                <button
                    type="button"
                    onClick={resend}
                    disabled={resending || cooldown > 0}
                    className="font-medium text-foreground disabled:cursor-not-allowed disabled:text-muted-foreground"
                >
                    {cooldown > 0 ? `Resend in ${cooldown}s` : resending ? "Sending…" : "Resend code"}
                </button>
            </div>
        </form>
    )
}

export default LoginFlow
