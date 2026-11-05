import type { Metadata } from "next"
import { Suspense } from "react"
import PageHeader from "@/components/Application/Admin/PageHeader"
import LeadsTable from "@/components/Application/Admin/leads/LeadsTable"
import { Skeleton } from "@/components/ui/skeleton"
import { ADMIN_DASHBOARD, ADMIN_LEADS_SHOW } from "@/routes/AdminPanelRoute"

export const metadata: Metadata = { title: "Leads" }

// Server shell + client table. The table reads filters from the URL
// (useSearchParams), so it sits behind Suspense.
export default function LeadsPage() {
    return (
        <div className="flex flex-col gap-6">
            <PageHeader
                title="Leads"
                description="Everything sent through the contact form."
                breadcrumb={[
                    { href: ADMIN_DASHBOARD, label: "Dashboard" },
                    { href: ADMIN_LEADS_SHOW, label: "Leads" },
                ]}
            />
            <Suspense fallback={<Skeleton className="h-96 rounded-xl" />}>
                <LeadsTable view="inbox" />
            </Suspense>
        </div>
    )
}
