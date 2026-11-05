"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2Icon, LogOutIcon } from "lucide-react"
import { toast } from "sonner"
import type { z } from "zod"
import ConfirmDialog from "@/components/Application/Admin/ConfirmDialog"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { QUERY_KEYS, fetchMe } from "@/lib/adminQueries"
import { ApiError, adminFetch } from "@/lib/apiClient"
import { formatDateTime } from "@/lib/format"
import { PASSWORD_MIN } from "@/lib/passwordPolicy"
import { changePasswordSchema } from "@/lib/zodSchema"

type PasswordInput = z.input<typeof changePasswordSchema>

export default function AccountSettings() {
    const { data: me, isPending } = useQuery({ queryKey: QUERY_KEYS.me, queryFn: fetchMe })

    return (
        <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
            <section className="h-fit rounded-xl border border-border bg-background p-5 sm:p-6" aria-labelledby="account-heading">
                <h2 id="account-heading" className="mb-4 text-sm font-semibold">
                    Account
                </h2>
                {isPending ? (
                    <div className="flex flex-col gap-3">
                        <Skeleton className="h-10" />
                        <Skeleton className="h-10" />
                    </div>
                ) : (
                    <dl className="flex flex-col gap-4 text-sm">
                        <div>
                            <dt className="text-xs text-muted-foreground">Email</dt>
                            <dd className="break-all">{me?.email}</dd>
                        </div>
                        <div>
                            <dt className="text-xs text-muted-foreground">Last sign-in</dt>
                            <dd>{formatDateTime(me?.lastLoginAt)}</dd>
                        </div>
                        <div>
                            <dt className="text-xs text-muted-foreground">Password last changed</dt>
                            <dd>{formatDateTime(me?.passwordChangedAt)}</dd>
                        </div>
                    </dl>
                )}
                <p className="mt-5 text-xs text-muted-foreground">
                    The sign-in email is fixed by the server (ADMIN_EMAIL). Forgotten password? Reset it from the server with{" "}
                    <code className="font-mono">npm run admin -- reset-password</code>.
                </p>
                <SignOutEverywhere />
            </section>

            <ChangePasswordForm />
        </div>
    )
}

function ChangePasswordForm() {
    const [formError, setFormError] = useState<string | null>(null)
    const { register, handleSubmit, formState, reset, setError } = useForm<PasswordInput>({
        resolver: zodResolver(changePasswordSchema),
        defaultValues: { currentPassword: "", password: "", confirmPassword: "" },
    })

    const onSubmit = async (values: PasswordInput) => {
        setFormError(null)
        try {
            const { message } = await adminFetch("/api/auth/change-password", { method: "PUT", body: values })
            toast.success(message)
            reset()
        } catch (error) {
            if (error instanceof ApiError && Object.keys(error.fields).length) {
                for (const [field, message] of Object.entries(error.fields)) {
                    if (field in values) setError(field as keyof PasswordInput, { message }, { shouldFocus: true })
                }
                return
            }
            setFormError(error instanceof ApiError ? error.message : "Couldn't change the password.")
        }
    }

    return (
        <section className="rounded-xl border border-border bg-background p-5 sm:p-6" aria-labelledby="password-heading">
            <h2 id="password-heading" className="text-sm font-semibold">
                Change password
            </h2>
            <p className="mt-1 mb-5 text-sm text-muted-foreground">Every other signed-in device will be signed out.</p>
            <form onSubmit={handleSubmit(onSubmit)} noValidate>
                {/* Lets password managers attach the new password to the right account. */}
                <input type="text" name="username" autoComplete="username" hidden readOnly />
                <FieldGroup className="gap-4">
                    <Field data-invalid={Boolean(formState.errors.currentPassword)}>
                        <FieldLabel htmlFor="currentPassword">Current password</FieldLabel>
                        <Input id="currentPassword" type="password" autoComplete="current-password" {...register("currentPassword")} />
                        <FieldError errors={[formState.errors.currentPassword]} />
                    </Field>
                    <Field data-invalid={Boolean(formState.errors.password)}>
                        <FieldLabel htmlFor="password">New password</FieldLabel>
                        <Input id="password" type="password" autoComplete="new-password" {...register("password")} />
                        <FieldDescription>At least {PASSWORD_MIN} characters with upper- and lowercase letters, a number and a symbol.</FieldDescription>
                        <FieldError errors={[formState.errors.password]} />
                    </Field>
                    <Field data-invalid={Boolean(formState.errors.confirmPassword)}>
                        <FieldLabel htmlFor="confirmPassword">Repeat new password</FieldLabel>
                        <Input id="confirmPassword" type="password" autoComplete="new-password" {...register("confirmPassword")} />
                        <FieldError errors={[formState.errors.confirmPassword]} />
                    </Field>
                    {formError && (
                        <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                            {formError}
                        </p>
                    )}
                    <Button type="submit" disabled={formState.isSubmitting} className="w-full sm:w-auto">
                        {formState.isSubmitting && <Loader2Icon className="animate-spin" />}
                        Change password
                    </Button>
                </FieldGroup>
            </form>
        </section>
    )
}

function SignOutEverywhere() {
    const [open, setOpen] = useState(false)
    const [pending, setPending] = useState(false)

    const run = async () => {
        setPending(true)
        try {
            await adminFetch("/api/auth/logout-all", { method: "POST" })
            window.location.replace("/auth/login")
        } catch (error) {
            setPending(false)
            toast.error(error instanceof ApiError ? error.message : "Couldn't sign out everywhere.")
        }
    }

    return (
        <>
            <Button variant="outline" className="mt-5 w-full" onClick={() => setOpen(true)}>
                <LogOutIcon /> Sign out everywhere
            </Button>
            <ConfirmDialog
                open={open}
                onOpenChange={setOpen}
                title="Sign out everywhere?"
                description="Every device signed in to the admin portal — including this one — will be signed out."
                confirmLabel="Sign out everywhere"
                pending={pending}
                onConfirm={run}
            />
        </>
    )
}
