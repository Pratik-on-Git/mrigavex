// Fixed-window in-memory rate limiter for public endpoints (login, contact).
//
// Caveat (same as EnergyFlow): state lives in this server instance's memory,
// so it resets on restart/cold start and isn't shared between serverless
// instances. It still stops casual floods from one client. Durable protection
// for the admin account is the DB-backed lockout on the Admin record.

type Bucket = { count: number; resetAt: number }

const buckets = new Map<string, Bucket>()
let lastSweep = 0

function sweep(now: number) {
    if (now - lastSweep < 60_000) return
    lastSweep = now
    for (const [key, bucket] of buckets) if (bucket.resetAt <= now) buckets.delete(key)
}

export type RateLimitResult = { ok: boolean; remaining: number; retryAfterSeconds: number }

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
    const now = Date.now()
    sweep(now)

    let bucket = buckets.get(key)
    if (!bucket || bucket.resetAt <= now) {
        bucket = { count: 0, resetAt: now + windowMs }
        buckets.set(key, bucket)
    }

    bucket.count += 1
    const retryAfterSeconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000))
    return { ok: bucket.count <= limit, remaining: Math.max(0, limit - bucket.count), retryAfterSeconds }
}

export function resetRateLimit(key: string) {
    buckets.delete(key)
}
