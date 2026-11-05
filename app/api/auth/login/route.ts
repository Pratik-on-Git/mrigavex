import { configuredAdminEmail } from "@/lib/authentication"
import { connectDB } from "@/lib/databaseConnection"
import { catchError, readJson, response, validationError } from "@/lib/helperFunction"
import { rateLimit } from "@/lib/rateLimit"
import { clientIp, isSameOrigin } from "@/lib/request"
import { CHALLENGE_TTL_SECONDS } from "@/lib/session"
import { AUTH_POLICY, MailDeliveryError, comparePassword, maskEmail, setChallengeCookie, startChallenge } from "@/lib/services/authService"
import { loginSchema } from "@/lib/zodSchema"
import AdminModel from "@/models/Admin.model"

// Step 1 of 2: email + password. On success a 6-digit code is emailed and a
// short-lived challenge cookie (scoped to /api/auth) is set. No session yet.
export async function POST(request: Request) {
    try {
        if (!isSameOrigin(request)) return response(false, 403, "Request blocked.")

        const limit = rateLimit(`login:${clientIp(request)}`, AUTH_POLICY.loginPerIp.limit, AUTH_POLICY.loginPerIp.windowMs)
        if (!limit.ok) {
            return response(false, 429, "Too many sign-in attempts. Please wait and try again.", { retryAfter: limit.retryAfterSeconds }, {
                headers: { "Retry-After": String(limit.retryAfterSeconds) },
            })
        }

        const parsed = loginSchema.safeParse(await readJson(request))
        if (!parsed.success) return validationError(parsed.error)
        const { email, password } = parsed.data

        const allowedEmail = configuredAdminEmail()
        if (!allowedEmail) {
            console.error("[auth] ADMIN_EMAIL is not set — admin sign-in is disabled.")
            return response(false, 503, "Admin sign-in isn't configured yet.")
        }

        await connectDB()
        // Only the configured owner email is ever looked up.
        const admin = email === allowedEmail
            ? await AdminModel.findOne({ email }).select("+passwordHash failedLoginCount lockedUntil sessionVersion")
            : null

        if (admin?.lockedUntil && admin.lockedUntil.getTime() > Date.now()) {
            const minutes = Math.ceil((admin.lockedUntil.getTime() - Date.now()) / 60_000)
            return response(false, 429, `Too many sign-in attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`, {
                retryAfter: minutes * 60,
            })
        }

        // Always runs bcrypt (dummy hash for unknown emails) so timing is equal.
        const valid = await comparePassword(password, admin?.passwordHash)

        if (!admin || !valid) {
            if (admin) {
                const updated = await AdminModel.findOneAndUpdate(
                    { _id: admin._id },
                    { $inc: { failedLoginCount: 1 } },
                    { returnDocument: "after", projection: { failedLoginCount: 1 } }
                )
                if ((updated?.failedLoginCount ?? 0) >= AUTH_POLICY.maxFailedLogins) {
                    await AdminModel.updateOne(
                        { _id: admin._id },
                        { $set: { failedLoginCount: 0, lockedUntil: new Date(Date.now() + AUTH_POLICY.lockMinutes * 60_000) } }
                    )
                    console.warn(`[auth] admin locked for ${AUTH_POLICY.lockMinutes} min after repeated failures`)
                }
            }
            return response(false, 401, "Incorrect email or password.")
        }

        await AdminModel.updateOne({ _id: admin._id }, { $set: { failedLoginCount: 0, lockedUntil: null } })

        let challengeToken: string
        try {
            challengeToken = await startChallenge(String(admin._id), admin.email, request.headers.get("user-agent") ?? "")
        } catch (error) {
            if (error instanceof MailDeliveryError) {
                return response(false, 503, "We couldn't email your sign-in code. Check the mail settings and try again.")
            }
            throw error
        }

        const res = response(true, 200, "We emailed you a 6-digit code.", {
            sentTo: maskEmail(admin.email),
            expiresIn: CHALLENGE_TTL_SECONDS,
            resendAfter: AUTH_POLICY.resendCooldownSeconds,
        })
        setChallengeCookie(res, challengeToken)
        return res
    } catch (error) {
        return catchError(error, "Sign-in failed. Please try again.")
    }
}
