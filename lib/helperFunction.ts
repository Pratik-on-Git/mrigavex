import { unstable_rethrow } from "next/navigation"
import { NextResponse } from "next/server"
import type { ZodError } from "zod"

// One JSON envelope for every API route: { success, statusCode, message, data }.
// Unlike EnergyFlow's older routes, the HTTP status always matches statusCode,
// so fetch callers can rely on response.ok as well as `success`.
export function response<T = unknown>(
    success: boolean,
    statusCode: number,
    message: string,
    data: T | Record<string, never> = {},
    init: ResponseInit = {}
) {
    return NextResponse.json(
        { success, statusCode, message, data },
        { ...init, status: init.status ?? statusCode }
    )
}

// First human-readable issue from a Zod error, plus a field → message map the
// client can show next to inputs.
export function zodIssues(error: ZodError) {
    const fields: Record<string, string> = {}
    for (const issue of error.issues) {
        const key = issue.path.join(".") || "_"
        if (!fields[key]) fields[key] = issue.message
    }
    return { message: error.issues[0]?.message ?? "Invalid or missing fields.", fields }
}

export function validationError(error: ZodError) {
    const { message, fields } = zodIssues(error)
    return response(false, 400, message, { fields })
}

type MongoLikeError = { code?: number; keyPattern?: Record<string, unknown>; message?: string; name?: string }

// Last-resort handler. Raw errors (stack traces, connection strings, query
// shapes) are only returned in development.
export function catchError(error: unknown, customMessage?: string) {
    // Next's own control-flow errors (prerender bail-outs, redirect, notFound)
    // must keep propagating, not become a 500 JSON body.
    unstable_rethrow(error)
    const err = (error ?? {}) as MongoLikeError
    console.error("[api]", err?.name ?? "Error", err?.message ?? error)

    if (err.code === 11000) {
        const keys = Object.keys(err.keyPattern ?? {}).join(", ")
        return response(false, 409, `A record with the same ${keys || "value"} already exists.`)
    }

    const isDev = process.env.NODE_ENV === "development"
    return response(false, 500, isDev ? (err.message ?? String(error)) : customMessage || "Something went wrong. Please try again.")
}

// Escape user text before it goes into a MongoDB $regex: raw "(" or "*" would
// throw or open a ReDoS vector.
export const escapeRegex = (value = "") => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

export async function readJson(request: Request): Promise<unknown> {
    try {
        return await request.json()
    } catch {
        return null
    }
}
