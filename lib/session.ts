import { SignJWT, jwtVerify } from "jose"

// Signed tokens for the admin portal. Two kinds, never interchangeable
// (the `typ` claim is checked):
//
//  - session:   issued after password + emailed code. Lives in an httpOnly,
//               SameSite=Strict cookie for SESSION_TTL. Carries the admin's
//               `ver` (sessionVersion) so "sign out everywhere" and password
//               changes revoke every older token on the next DB check.
//  - challenge: issued after the password step only. Proves step 1 passed and
//               names the pending code; scoped to /api/auth and short-lived.
//
// No "server-only" import: proxy.ts uses verifySession for its optimistic,
// signature-only check. Nothing here exposes the secret.

export const SESSION_TTL_SECONDS = 12 * 60 * 60
export const CHALLENGE_TTL_SECONDS = 10 * 60

const isProd = process.env.NODE_ENV === "production"

// __Host- cookies must be Secure, Path=/ and host-only, so a sibling
// subdomain can never set or overwrite the admin session. Plain http
// localhost can't hold Secure cookies, hence the dev name.
export const SESSION_COOKIE = isProd ? "__Host-mx_admin" : "mx_admin"
export const CHALLENGE_COOKIE = isProd ? "__Secure-mx_challenge" : "mx_challenge"
export const CHALLENGE_COOKIE_PATH = "/api/auth"

export type SessionClaims = { sub: string; ver: number; typ: "session" }
export type ChallengeClaims = { sub: string; cid: string; typ: "challenge" }

function secretKey() {
    const secret = process.env.AUTH_SECRET
    if (!secret || secret.length < 32) {
        throw new Error("AUTH_SECRET must be set to at least 32 characters.")
    }
    return new TextEncoder().encode(secret)
}

async function sign(claims: Record<string, unknown>, subject: string, ttlSeconds: number) {
    return new SignJWT(claims)
        .setProtectedHeader({ alg: "HS256" })
        .setSubject(subject)
        .setIssuedAt()
        .setExpirationTime(`${ttlSeconds}s`)
        .setIssuer("mrigavex")
        .setAudience("admin")
        .sign(secretKey())
}

async function verify(token: string | undefined) {
    if (!token || token.length > 2048) return null
    try {
        const { payload } = await jwtVerify(token, secretKey(), {
            algorithms: ["HS256"],
            issuer: "mrigavex",
            audience: "admin",
        })
        return payload
    } catch {
        return null
    }
}

export function signSession(adminId: string, version: number) {
    return sign({ ver: version, typ: "session" }, adminId, SESSION_TTL_SECONDS)
}

export async function verifySession(token: string | undefined): Promise<SessionClaims | null> {
    const payload = await verify(token)
    if (!payload || payload.typ !== "session" || typeof payload.sub !== "string" || typeof payload.ver !== "number") {
        return null
    }
    return { sub: payload.sub, ver: payload.ver, typ: "session" }
}

export function signChallenge(adminId: string, challengeId: string) {
    return sign({ cid: challengeId, typ: "challenge" }, adminId, CHALLENGE_TTL_SECONDS)
}

export async function verifyChallenge(token: string | undefined): Promise<ChallengeClaims | null> {
    const payload = await verify(token)
    if (!payload || payload.typ !== "challenge" || typeof payload.sub !== "string" || typeof payload.cid !== "string") {
        return null
    }
    return { sub: payload.sub, cid: payload.cid, typ: "challenge" }
}

export const sessionCookieOptions = {
    httpOnly: true,
    secure: isProd,
    sameSite: "strict" as const,
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
}

export const challengeCookieOptions = {
    httpOnly: true,
    secure: isProd,
    sameSite: "strict" as const,
    path: CHALLENGE_COOKIE_PATH,
    maxAge: CHALLENGE_TTL_SECONDS,
}
