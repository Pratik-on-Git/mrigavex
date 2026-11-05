// Browser-side fetch for our own API's { success, statusCode, message, data }
// envelope. Normalises every failure mode into an ApiError with a message that
// is safe to show: offline, timeouts, HTML error pages from a proxy (502),
// validation errors with per-field messages, and expired admin sessions.

export class ApiError extends Error {
    status: number
    fields: Record<string, string>
    data: Record<string, unknown>

    constructor(message: string, status: number, data: Record<string, unknown> = {}) {
        super(message)
        this.name = "ApiError"
        this.status = status
        this.data = data
        this.fields = (data.fields as Record<string, string>) ?? {}
    }
}

type Options = {
    method?: "GET" | "POST" | "PUT" | "DELETE"
    body?: unknown
    signal?: AbortSignal
    timeoutMs?: number
}

export type ApiResult<T> = { message: string; data: T }

export async function apiFetch<T = unknown>(url: string, { method = "GET", body, signal, timeoutMs = 20_000 }: Options = {}): Promise<ApiResult<T>> {
    const timeout = AbortSignal.timeout(timeoutMs)
    const combined = signal ? AbortSignal.any([signal, timeout]) : timeout

    let res: Response
    try {
        res = await fetch(url, {
            method,
            headers: body === undefined ? undefined : { "Content-Type": "application/json" },
            body: body === undefined ? undefined : JSON.stringify(body),
            credentials: "same-origin",
            cache: "no-store",
            signal: combined,
        })
    } catch (error) {
        if (signal?.aborted) throw error // caller cancelled: let it propagate as-is
        if (timeout.aborted) throw new ApiError("The server took too long to respond. Please try again.", 0)
        throw new ApiError("Couldn't reach the server. Check your connection and try again.", 0)
    }

    let payload: { success?: boolean; message?: string; data?: unknown } | null = null
    try {
        payload = await res.json()
    } catch {
        payload = null
    }

    if (!res.ok || !payload?.success) {
        const message =
            payload?.message ||
            (res.status >= 500 ? "Something went wrong on our side. Please try again." : `Request failed (${res.status}).`)
        throw new ApiError(message, res.status, (payload?.data as Record<string, unknown>) ?? {})
    }

    return { message: payload.message ?? "", data: payload.data as T }
}

// Admin variant: an expired or revoked session clears the cookie and sends the
// owner to sign in, returning to the same page afterwards. The cookie must be
// cleared first, otherwise the proxy (which only checks the signature) would
// bounce a revoked-but-unexpired token straight back to the admin page.
let redirecting = false

export async function adminFetch<T = unknown>(url: string, options: Options = {}): Promise<ApiResult<T>> {
    try {
        return await apiFetch<T>(url, options)
    } catch (error) {
        if (error instanceof ApiError && error.status === 401 && typeof window !== "undefined" && !redirecting) {
            redirecting = true
            await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" }).catch(() => undefined)
            const callback = window.location.pathname + window.location.search
            // Hard navigation on purpose: drops all cached admin data from memory.
            // eslint-disable-next-line @next/next/no-location-assign-relative-destination
            window.location.assign(`/auth/login?expired=1&callback=${encodeURIComponent(callback)}`)
        }
        throw error
    }
}
