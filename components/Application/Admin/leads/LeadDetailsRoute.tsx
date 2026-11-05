"use client"

import { useParams } from "next/navigation"
import { FileQuestionIcon } from "lucide-react"
import AdminEmptyState from "@/components/Application/Admin/AdminEmptyState"
import LeadDetails from "@/components/Application/Admin/leads/LeadDetails"
import { ADMIN_LEADS_SHOW } from "@/routes/AdminPanelRoute"

// Validates the id from the URL before any request: a hand-edited or
// truncated link shows "not found" instead of a server error.
export default function LeadDetailsRoute() {
    const { id } = useParams<{ id: string }>()

    if (typeof id !== "string" || !/^[a-f0-9]{24}$/i.test(id)) {
        return (
            <div className="rounded-xl border border-border bg-background">
                <AdminEmptyState
                    icon={FileQuestionIcon}
                    tone="danger"
                    title="Lead not found"
                    description="This link doesn't point to a lead."
                    action={{ href: ADMIN_LEADS_SHOW, label: "Back to leads" }}
                />
            </div>
        )
    }

    // Keyed by id: moving between leads starts a fresh editor.
    return <LeadDetails key={id} id={id.toLowerCase()} />
}
