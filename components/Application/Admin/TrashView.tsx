"use client"

import { useSearchParams } from "next/navigation"
import { Trash2Icon } from "lucide-react"
import AdminEmptyState from "@/components/Application/Admin/AdminEmptyState"
import PageHeader from "@/components/Application/Admin/PageHeader"
import LeadsTable from "@/components/Application/Admin/leads/LeadsTable"
import { ADMIN_DASHBOARD, ADMIN_TRASH_OF } from "@/routes/AdminPanelRoute"

// One trash screen for every soft-deletable entity, chosen by ?trashof=.
const TRASH_CONFIG = {
    leads: {
        title: "Trash",
        description: "Trashed leads. Restore them, or delete them permanently.",
        render: () => <LeadsTable view="trash" />,
    },
} as const

export default function TrashView() {
    const trashOf = useSearchParams().get("trashof") ?? "leads"
    const config = TRASH_CONFIG[trashOf as keyof typeof TRASH_CONFIG]
    const crumbs = [{ href: ADMIN_DASHBOARD, label: "Dashboard" }, { label: "Trash" }]

    if (!config) {
        return (
            <div className="flex flex-col gap-6">
                <PageHeader title="Trash" breadcrumb={crumbs} />
                <div className="rounded-xl border border-border bg-background">
                    <AdminEmptyState
                        icon={Trash2Icon}
                        title="Unknown trash section"
                        description="Choose a section to review deleted items."
                        action={{ href: ADMIN_TRASH_OF("leads"), label: "Open lead trash" }}
                    />
                </div>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-6">
            <PageHeader title={config.title} description={config.description} breadcrumb={crumbs} />
            {config.render()}
        </div>
    )
}
