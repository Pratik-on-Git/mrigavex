import "server-only"
import { createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto"
import bcrypt from "bcryptjs"
import { NextResponse } from "next/server"
import { adminOtpEmail } from "@/email/adminOtp"
import { isMailConfigured, sendMail } from "@/lib/sendMail"
import {
    CHALLENGE_COOKIE,
    CHALLENGE_TTL_SECONDS,
    SESSION_COOKIE,
    challengeCookieOptions,
    sessionCookieOptions,
    signChallenge,
    signSession,
} from "@/lib/session"
import AdminOtpModel from "@/models/AdminOtp.model"

// Sign-in policy. Kept together so CLAUDE.md and the UI copy can point here.
export const AUTH_POLICY = {
    // Wrong passwords before the account locks (durable, in the DB).
    maxFailedLogins: 10,
    lockMinutes: 15,
    // Per-IP throttles (in-memory, per instance).
    loginPerIp: { limit: 10, windowMs: 15 * 60 * 1000 },
    verifyPerIp: { limit: 15, windowMs: 15 * 60 * 1000 },
    resendPerIp: { limit: 6, windowMs: 15 * 60 * 1000 },
    // Emailed code.
    otpMaxAttempts: 5,
    otpMaxResends: 3,
    resendCooldownSeconds: 30,
} as const

// Compared against when the email isn't the admin's, so a wrong email takes
// as long as a wrong password and response timing can't reveal the account.
let dummyHash: string | null = null
export async function comparePassword(password: string, hash: string | null | undefined) {
    if (!hash) {
        dummyHash ??= await bcrypt.hash("not-the-password-" + randomBytes(8).toString("hex"), 12)
        await bcrypt.compare(password, dummyHash)
        return false
    }
    return bcrypt.compare(password, hash)
}

function authSecret() {
    const secret = process.env.AUTH_SECRET
    if (!secret || secret.length < 32) throw new Error("AUTH_SECRET must be set to at least 32 characters.")
    return secret
}

// The code is bound to its challenge: a hash leaked from one challenge can't
// be replayed against another.
export function hashCode(code: string, challengeId: string) {
    return createHmac("sha256", authSecret()).update(`${challengeId}:${code}`).digest("hex")
}

export function codesMatch(code: string, challengeId: string, storedHash: string) {
    const a = Buffer.from(hashCode(code, challengeId), "hex")
    const b = Buffer.from(storedHash, "hex")
    return a.length === b.length && timingSafeEqual(a, b)
}

export const newCode = () => String(randomInt(0, 1_000_000)).padStart(6, "0")

export class MailDeliveryError extends Error {}

// Email the code. Without working SMTP in development the code is printed to
// the server console so the portal stays usable locally; in production a
// failed send is an error (the admin must not be told a code is on its way).
export async function deliverCode(email: string, code: string, userAgent: string) {
    const html = adminOtpEmail({ code, minutes: CHALLENGE_TTL_SECONDS / 60, at: new Date(), userAgent })

    if (!isMailConfigured() && process.env.NODE_ENV !== "production") {
        console.warn(`\n[auth] SMTP not configured — DEV sign-in code for ${email}: ${code}\n`)
        return
    }

    const result = await sendMail("Your admin sign-in code", email, html)
    if (!result.success) {
        if (process.env.NODE_ENV !== "production") {
            console.warn(`\n[auth] Mail failed (${result.message}) — DEV sign-in code for ${email}: ${code}\n`)
            return
        }
        throw new MailDeliveryError(result.message)
    }
}

// Starts the second step: one pending challenge per admin (older ones are
// discarded), code emailed, challenge cookie returned on the response.
export async function startChallenge(adminId: string, email: string, userAgent: string) {
    const challengeId = randomBytes(24).toString("base64url")
    const code = newCode()

    await AdminOtpModel.deleteMany({ admin: adminId })
    const otp = await AdminOtpModel.create({
        admin: adminId,
        challengeId,
        codeHash: hashCode(code, challengeId),
        expiresAt: new Date(Date.now() + CHALLENGE_TTL_SECONDS * 1000),
    })

    try {
        await deliverCode(email, code, userAgent)
    } catch (error) {
        await AdminOtpModel.deleteOne({ _id: otp._id })
        throw error
    }

    return signChallenge(adminId, challengeId)
}

export function setChallengeCookie(res: NextResponse, token: string) {
    res.cookies.set(CHALLENGE_COOKIE, token, challengeCookieOptions)
}

export function clearChallengeCookie(res: NextResponse) {
    res.cookies.set(CHALLENGE_COOKIE, "", { ...challengeCookieOptions, maxAge: 0 })
}

export async function setSessionCookie(res: NextResponse, adminId: string, sessionVersion: number) {
    res.cookies.set(SESSION_COOKIE, await signSession(adminId, sessionVersion), sessionCookieOptions)
}

export function clearSessionCookie(res: NextResponse) {
    res.cookies.set(SESSION_COOKIE, "", { ...sessionCookieOptions, maxAge: 0 })
}

// "o•••r@example.com" — confirms where the code went without echoing the
// full address back to whoever typed the password.
export function maskEmail(email: string) {
    const [local, domain] = email.split("@")
    if (!domain) return "your email"
    const visible = local.length <= 2 ? local[0] : `${local[0]}${"•".repeat(Math.min(local.length - 2, 6))}${local.at(-1)}`
    return `${visible}@${domain}`
}
