import type { Metadata } from "next"
import Link from "next/link"
import { InboxIcon } from "lucide-react"
import DashboardOverview from "@/components/Application/Admin/dashboard/DashboardOverview"
import PageHeader from "@/components/Application/Admin/PageHeader"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ADMIN_LEADS_SHOW } from "@/routes/AdminPanelRoute"

export const metadata: Metadata = { title: "Dashboard" }

export default function DashboardPage() {
    return (
        <div className="flex flex-col gap-6">
            <PageHeader
                title="Dashboard"
                description="Enquiries from your website at a glance."
                actions={
                    <Link href={ADMIN_LEADS_SHOW} className={cn(buttonVariants({ variant: "outline" }), "bg-background")}>
                        <InboxIcon /> Open leads
                    </Link>
                }
            />
            <DashboardOverview />
        </div>
    )
}
