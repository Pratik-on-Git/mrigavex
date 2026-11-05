import bcrypt from "bcryptjs"
import { requireAdmin } from "@/lib/authentication"
import { catchError, readJson, response, validationError } from "@/lib/helperFunction"
import { BCRYPT_ROUNDS } from "@/lib/passwordPolicy"
import { rateLimit } from "@/lib/rateLimit"
import { clientIp } from "@/lib/request"
import { sendMail } from "@/lib/sendMail"
import { setSessionCookie } from "@/lib/services/authService"
import { changePasswordSchema } from "@/lib/zodSchema"
import { passwordChangedEmail } from "@/email/passwordChanged"
import AdminModel from "@/models/Admin.model"

// Change the admin password from a signed-in session. Requires the current
// password (a stolen, unlocked laptop shouldn't be enough), revokes every
// other session, and keeps this one signed in with a fresh token.
export async function PUT(request: Request) {
    try {
        const guard = await requireAdmin(request)
        if (!guard.ok) return guard.res

        const limit = rateLimit(`change-password:${clientIp(request)}`, 5, 15 * 60 * 1000)
        if (!limit.ok) return response(false, 429, "Too many attempts. Please wait and try again.")

        const parsed = changePasswordSchema.safeParse(await readJson(request))
        if (!parsed.success) return validationError(parsed.error)

        const admin = await AdminModel.findById(guard.admin.id).select("+passwordHash sessionVersion email")
        if (!admin) return response(false, 401, "Your session has ended. Please sign in again.")

        if (!(await bcrypt.compare(parsed.data.currentPassword, admin.passwordHash))) {
            return response(false, 400, "Your current password is incorrect.", { fields: { currentPassword: "Your current password is incorrect." } })
        }

        const now = new Date()
        const updated = await AdminModel.findOneAndUpdate(
            { _id: admin._id },
            {
                $set: { passwordHash: await bcrypt.hash(parsed.data.password, BCRYPT_ROUNDS), passwordChangedAt: now },
                $inc: { sessionVersion: 1 },
            },
            { returnDocument: "after", projection: { sessionVersion: 1 } }
        )

        // Best effort: the change already succeeded.
        await sendMail("Your admin password was changed", admin.email, passwordChangedEmail({ at: now }))

        const res = response(true, 200, "Password changed. Other devices have been signed out.")
        await setSessionCookie(res, String(admin._id), updated?.sessionVersion ?? (admin.sessionVersion ?? 1) + 1)
        return res
    } catch (error) {
        return catchError(error)
    }
}
