import { FileQuestionIcon } from "lucide-react"
import AdminEmptyState from "@/components/Application/Admin/AdminEmptyState"
import { ADMIN_DASHBOARD } from "@/routes/AdminPanelRoute"

// Unknown admin URLs (via the [...missing] catch-all) keep the sidebar.
export default function AdminNotFound() {
    return (
        <div className="rounded-xl border border-border bg-background">
            <AdminEmptyState
                icon={FileQuestionIcon}
                tone="danger"
                title="Page not found"
                description="This admin page doesn't exist or may have moved."
                action={{ href: ADMIN_DASHBOARD, label: "Back to dashboard" }}
            />
        </div>
    )
}
