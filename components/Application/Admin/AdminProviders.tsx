"use client"

import { useState, type ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { TooltipProvider } from "@/components/ui/tooltip"
import { ApiError } from "@/lib/apiClient"

// Admin-only providers. React Query lives here (not in the root layout like
// EnergyFlow's GlobalProvider) so the public site ships none of it.
export default function AdminProviders({ children }: { children: ReactNode }) {
    const [client] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        staleTime: 15_000,
                        gcTime: 5 * 60_000,
                        // Leads arrive while the portal is open in a background tab.
                        refetchOnWindowFocus: true,
                        // Auth / not-found / validation failures won't fix themselves.
                        retry: (count, error) => !(error instanceof ApiError && error.status >= 400 && error.status < 500) && count < 2,
                    },
                    mutations: { retry: 0 },
                },
            })
    )

    return (
        <QueryClientProvider client={client}>
            <TooltipProvider delay={150}>{children}</TooltipProvider>
        </QueryClientProvider>
    )
}
