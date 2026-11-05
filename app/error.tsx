"use client"

import { useEffect } from "react"
import Link from "next/link"
import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// Last-resort error boundary. The digest is shown so a report can be matched
// to the server log without exposing the error itself.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
    useEffect(() => {
        console.error(error)
    }, [error])

    return (
        <div className="mx-auto flex min-h-[70vh] w-full max-w-xl flex-col items-start justify-center px-5">
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-muted-foreground">Error</p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight">Something went wrong.</h1>
            <p className="mt-3 text-muted-foreground">Please try again. If it keeps happening, come back in a little while.</p>
            {error.digest && <p className="mt-2 font-mono text-xs text-muted-foreground">Ref: {error.digest}</p>}
            <div className="mt-8 flex gap-3">
                <Button onClick={reset} size="lg" className="rounded-full px-6">
                    Try again
                </Button>
                <Link href="/" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "rounded-full px-6")}>
                    Go home
                </Link>
            </div>
        </div>
    )
}
