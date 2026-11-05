import { cookies } from "next/headers"
import { connectDB } from "@/lib/databaseConnection"
import { catchError, response } from "@/lib/helperFunction"
import { rateLimit } from "@/lib/rateLimit"
import { clientIp, isSameOrigin } from "@/lib/request"
import { CHALLENGE_COOKIE, CHALLENGE_TTL_SECONDS, signChallenge, verifyChallenge } from "@/lib/session"
import {
    AUTH_POLICY,
    MailDeliveryError,
    clearChallengeCookie,
    deliverCode,
    hashCode,
    newCode,
    setChallengeCookie,
} from "@/lib/services/authService"
import AdminModel from "@/models/Admin.model"
import AdminOtpModel from "@/models/AdminOtp.model"

// Sends a fresh code for the pending challenge. Cooldown between sends and a
// cap per challenge stop the owner's inbox being flooded. The new code is
// only stored after the email went out, so a failed send leaves the previous
// code valid.
export async function POST(request: Request) {
    try {
        if (!isSameOrigin(request)) return response(false, 403, "Request blocked.")

        const limit = rateLimit(`resend:${clientIp(request)}`, AUTH_POLICY.resendPerIp.limit, AUTH_POLICY.resendPerIp.windowMs)
        if (!limit.ok) return response(false, 429, "Too many codes requested. Please wait and try again.", { retryAfter: limit.retryAfterSeconds })

        const claims = await verifyChallenge((await cookies()).get(CHALLENGE_COOKIE)?.value)
        const restart = (message: string) => {
            const res = response(false, 410, message, { restart: true })
            clearChallengeCookie(res)
            return res
        }
        if (!claims) return restart("Your sign-in step expired. Enter your password again.")

        await connectDB()
        const otp = await AdminOtpModel.findOne({ challengeId: claims.cid, admin: claims.sub })
        if (!otp || otp.expiresAt.getTime() <= Date.now()) return restart("Your sign-in step expired. Enter your password again.")

        const sinceLast = (Date.now() - otp.lastSentAt.getTime()) / 1000
        if (sinceLast < AUTH_POLICY.resendCooldownSeconds) {
            const wait = Math.ceil(AUTH_POLICY.resendCooldownSeconds - sinceLast)
            return response(false, 429, `Please wait ${wait}s before requesting another code.`, { retryAfter: wait })
        }
        if (otp.resendCount >= AUTH_POLICY.otpMaxResends) {
            await AdminOtpModel.deleteOne({ _id: otp._id })
            return restart("Too many codes requested. Enter your password again.")
        }

        const admin = await AdminModel.findById(claims.sub).select("email").lean()
        if (!admin) return restart("This account can't sign in.")

        const code = newCode()
        try {
            await deliverCode(admin.email, code, request.headers.get("user-agent") ?? "")
        } catch (error) {
            if (error instanceof MailDeliveryError) {
                return response(false, 503, "We couldn't send a new code. Your previous code still works.")
            }
            throw error
        }

        await AdminOtpModel.updateOne(
            { _id: otp._id },
            {
                $set: {
                    codeHash: hashCode(code, claims.cid),
                    attempts: 0,
                    lastSentAt: new Date(),
                    expiresAt: new Date(Date.now() + CHALLENGE_TTL_SECONDS * 1000),
                },
                $inc: { resendCount: 1 },
            }
        )

        // The cookie's lifetime restarts with the new code.
        const res = response(true, 200, "We sent you a new code.", {
            expiresIn: CHALLENGE_TTL_SECONDS,
            resendAfter: AUTH_POLICY.resendCooldownSeconds,
            resendsLeft: AUTH_POLICY.otpMaxResends - otp.resendCount - 1,
        })
        setChallengeCookie(res, await signChallenge(claims.sub, claims.cid))
        return res
    } catch (error) {
        return catchError(error, "Couldn't send a new code. Please try again.")
    }
}
