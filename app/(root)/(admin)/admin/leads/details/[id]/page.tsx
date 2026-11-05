import type { Metadata } from "next"
import { Suspense } from "react"
import LeadDetailsRoute from "@/components/Application/Admin/leads/LeadDetailsRoute"
import { Skeleton } from "@/components/ui/skeleton"

export const metadata: Metadata = { title: "Lead" }

// `params` is request data under Cache Components, so the id is read inside
// a Suspense boundary (client side, via useParams).
export default function LeadDetailsPage() {
    return (
        <Suspense fallback={<Skeleton className="h-96 rounded-xl" />}>
            <LeadDetailsRoute />
        </Suspense>
    )
}
