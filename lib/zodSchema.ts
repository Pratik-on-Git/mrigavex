import { z } from "zod"
import { INQUIRY_TYPE_VALUES, LEAD_LIMITS, LEAD_SOURCES, LEAD_STATUS_VALUES } from "./leadConfig.ts"
import { PASSWORD_MAX, passwordPolicyMessage } from "./passwordPolicy.ts"

// Shared by client forms (zodResolver) and API routes (safeParse), so the
// browser and the server always agree on what is valid.
//
// Pure module (relative imports only): unit tests import it directly.

// Strip control characters (except tab/newline) and collapse runs of spaces.
// Pasted text from PDFs and chat apps often carries zero-width and control
// characters that make records unsearchable or break CSV/email output.
const clean = (value: string) =>
    value
        .normalize("NFC")
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F​-‍⁠﻿]/g, "")
        .trim()

const singleLine = (value: string) => clean(value).replace(/\s+/g, " ")

const multiLine = (value: string) =>
    clean(value)
        .replace(/\r\n?/g, "\n")
        .replace(/[ \t]+\n/g, "\n")
        // Keep paragraphs, but never more than one blank line in a row.
        .replace(/\n{3,}/g, "\n\n")

export const emailField = z
    .string({ error: "Enter your email address." })
    .transform((value) => singleLine(value).toLowerCase())
    .pipe(
        z
            .email({ error: "Enter a valid email address." })
            .max(LEAD_LIMITS.emailMax, { error: "That email address is too long." })
    )

// Phone is optional: an empty string stays empty. Digits, spaces, + ( ) - .
const phoneField = z
    .string()
    .optional()
    .default("")
    .transform((value) => singleLine(value ?? ""))
    .refine((value) => value === "" || /^\+?[0-9][0-9\s().-]{6,22}$/.test(value), {
        error: "Enter a valid phone number, or leave it empty.",
    })
    .refine((value) => value.replace(/\D/g, "").length <= 15 || value === "", {
        error: "That phone number has too many digits.",
    })

export const leadFormSchema = z.object({
    name: z
        .string({ error: "Enter your name." })
        .transform(singleLine)
        .pipe(
            z
                .string()
                .min(LEAD_LIMITS.nameMin, { error: "Enter your name." })
                .max(LEAD_LIMITS.nameMax, { error: `Keep your name under ${LEAD_LIMITS.nameMax} characters.` })
                // At least one letter in any script — rejects "!!!" or "123".
                .regex(/\p{L}/u, { error: "Enter your name." })
        ),
    email: emailField,
    organisation: z
        .string()
        .optional()
        .default("")
        .transform((value) => singleLine(value ?? ""))
        .pipe(z.string().max(LEAD_LIMITS.organisationMax, { error: `Keep this under ${LEAD_LIMITS.organisationMax} characters.` })),
    phone: phoneField,
    // The form has no topic field: it's set when the visitor arrives through a
    // practice area link, and is otherwise a general enquiry.
    inquiryType: z.enum(INQUIRY_TYPE_VALUES, { error: "Choose what this is about." }).default("general"),
    message: z
        .string({ error: "Tell us a little about your challenge." })
        .transform(multiLine)
        .pipe(
            z
                .string()
                .min(LEAD_LIMITS.messageMin, { error: `Write at least ${LEAD_LIMITS.messageMin} characters.` })
                .max(LEAD_LIMITS.messageMax, { error: `Keep it under ${LEAD_LIMITS.messageMax} characters.` })
        ),
})

export type LeadFormInput = z.input<typeof leadFormSchema>
export type LeadFormValues = z.output<typeof leadFormSchema>

// What the API accepts: the form plus anti-abuse metadata.
export const leadSubmitSchema = leadFormSchema.extend({
    source: z.enum(LEAD_SOURCES).optional().catch(undefined),
    // Honeypot: real visitors never see or fill it.
    website: z.string().max(500).optional().default(""),
    // How long the form was open before submitting, measured in the browser
    // (a duration, not a timestamp, so a wrong device clock can't matter).
    // Bots post instantly.
    elapsedMs: z.coerce.number().int().nonnegative().max(7 * 24 * 60 * 60 * 1000).optional().catch(undefined),
})

export const objectIdSchema = z.string().regex(/^[a-f0-9]{24}$/i, { error: "Invalid id." })

export const idListSchema = z
    .array(objectIdSchema)
    .min(1, { error: "Select at least one lead." })
    .max(LEAD_LIMITS.bulkMax, { error: `Select at most ${LEAD_LIMITS.bulkMax} leads at a time.` })
    .transform((ids) => [...new Set(ids.map((id) => id.toLowerCase()))])

export const leadUpdateSchema = z
    .object({
        _id: objectIdSchema,
        status: z.enum(LEAD_STATUS_VALUES).optional(),
        adminNotes: z
            .string()
            .max(LEAD_LIMITS.notesMax, { error: `Notes can be at most ${LEAD_LIMITS.notesMax} characters.` })
            .transform(multiLine)
            .optional(),
        // Version the editor loaded; a mismatch means another tab saved first.
        updatedAt: z.iso.datetime({ offset: true }).optional(),
    })
    .refine((data) => data.status !== undefined || data.adminNotes !== undefined, {
        error: "Nothing to update.",
    })

export const loginSchema = z.object({
    email: emailField,
    password: z.string({ error: "Enter your password." }).min(1, { error: "Enter your password." }).max(PASSWORD_MAX),
})

export const otpSchema = z.object({
    otp: z.string().regex(/^\d{6}$/, { error: "Enter the 6-digit code." }),
})

export const changePasswordSchema = z
    .object({
        currentPassword: z.string().min(1, { error: "Enter your current password." }).max(PASSWORD_MAX),
        password: z.string().superRefine((value, ctx) => {
            const problem = passwordPolicyMessage(value)
            if (problem) ctx.addIssue({ code: "custom", message: problem })
        }),
        confirmPassword: z.string(),
    })
    .refine((data) => data.password === data.confirmPassword, {
        error: "Passwords don't match.",
        path: ["confirmPassword"],
    })
    .refine((data) => data.password !== data.currentPassword, {
        error: "Choose a password different from the current one.",
        path: ["password"],
    })
