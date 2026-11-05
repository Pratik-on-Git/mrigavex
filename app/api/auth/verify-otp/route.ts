import { cookies } from "next/headers"
import { configuredAdminEmail } from "@/lib/authentication"
import { connectDB } from "@/lib/databaseConnection"
import { catchError, readJson, response, validationError } from "@/lib/helperFunction"
import { rateLimit } from "@/lib/rateLimit"
import { clientIp, hashIp, isSameOrigin } from "@/lib/request"
import { CHALLENGE_COOKIE, verifyChallenge } from "@/lib/session"
import { AUTH_POLICY, clearChallengeCookie, codesMatch, setSessionCookie } from "@/lib/services/authService"
import { otpSchema } from "@/lib/zodSchema"
import AdminModel from "@/models/Admin.model"
import AdminOtpModel from "@/models/AdminOtp.model"

// Step 2 of 2: the emailed code. Only reachable with the challenge cookie
// from step 1 — knowing the email alone is never enough. On success the
// session cookie is set and the challenge is destroyed.
const expired = (message = "Your sign-in step expired. Enter your password again.") => {
    const res = response(false, 410, message, { restart: true })
    clearChallengeCookie(res)
    return res
}

export async function POST(request: Request) {
    try {
        if (!isSameOrigin(request)) return response(false, 403, "Request blocked.")

        const ip = clientIp(request)
        const limit = rateLimit(`verify:${ip}`, AUTH_POLICY.verifyPerIp.limit, AUTH_POLICY.verifyPerIp.windowMs)
        if (!limit.ok) return response(false, 429, "Too many attempts. Please wait and try again.", { retryAfter: limit.retryAfterSeconds })

        const claims = await verifyChallenge((await cookies()).get(CHALLENGE_COOKIE)?.value)
        if (!claims) return expired()

        const parsed = otpSchema.safeParse(await readJson(request))
        if (!parsed.success) return validationError(parsed.error)

        await connectDB()
        const otp = await AdminOtpModel.findOne({ challengeId: claims.cid, admin: claims.sub })
        if (!otp || otp.expiresAt.getTime() <= Date.now()) {
            if (otp) await AdminOtpModel.deleteOne({ _id: otp._id })
            return expired("That code has expired. Enter your password again to get a new one.")
        }
        if (otp.attempts >= AUTH_POLICY.otpMaxAttempts) {
            await AdminOtpModel.deleteOne({ _id: otp._id })
            return expired("Too many incorrect codes. Enter your password again.")
        }

        if (!codesMatch(parsed.data.otp, claims.cid, otp.codeHash)) {
            const updated = await AdminOtpModel.findOneAndUpdate(
                { _id: otp._id },
                { $inc: { attempts: 1 } },
                { returnDocument: "after" }
            )
            const left = AUTH_POLICY.otpMaxAttempts - (updated?.attempts ?? AUTH_POLICY.otpMaxAttempts)
            if (left <= 0) {
                await AdminOtpModel.deleteOne({ _id: otp._id })
                return expired("Too many incorrect codes. Enter your password again.")
            }
            return response(false, 401, `That code isn't right. ${left} attempt${left === 1 ? "" : "s"} left.`, { attemptsLeft: left })
        }

        // Consume atomically: two tabs submitting the same code can't both win.
        const consumed = await AdminOtpModel.findOneAndDelete({ _id: otp._id, codeHash: otp.codeHash })
        if (!consumed) return expired()

        // Re-check the account now — it may have been reset, locked or the
        // owner email changed since step 1.
        const admin = await AdminModel.findById(claims.sub).select("email sessionVersion lockedUntil")
        if (!admin || admin.email !== configuredAdminEmail()) return expired("This account can't sign in.")
        if (admin.lockedUntil && admin.lockedUntil.getTime() > Date.now()) {
            return expired("This account is temporarily locked. Try again later.")
        }

        await AdminModel.updateOne(
            { _id: admin._id },
            { $set: { lastLoginAt: new Date(), lastLoginIpHash: hashIp(ip), failedLoginCount: 0 } }
        )

        const res = response(true, 200, "Signed in.")
        clearChallengeCookie(res)
        await setSessionCookie(res, String(admin._id), admin.sessionVersion ?? 1)
        return res
    } catch (error) {
        return catchError(error, "Verification failed. Please try again.")
    }
}
