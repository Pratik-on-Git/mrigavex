import { response } from "@/lib/helperFunction"
import { isSameOrigin } from "@/lib/request"
import { clearChallengeCookie, clearSessionCookie } from "@/lib/services/authService"

// Signs this browser out. Works even with an expired/invalid session so the
// UI can always recover to a clean state. (To revoke every device, use
// /api/auth/logout-all.)
export async function POST(request: Request) {
    if (!isSameOrigin(request)) return response(false, 403, "Request blocked.")
    const res = response(true, 200, "Signed out.")
    clearSessionCookie(res)
    clearChallengeCookie(res)
    return res
}
