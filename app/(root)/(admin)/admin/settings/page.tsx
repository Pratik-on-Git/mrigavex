import type { Metadata } from "next"
import PageHeader from "@/components/Application/Admin/PageHeader"
import AccountSettings from "@/components/Application/Admin/settings/AccountSettings"
import { ADMIN_DASHBOARD } from "@/routes/AdminPanelRoute"

export const metadata: Metadata = { title: "Settings" }

export default function SettingsPage() {
    return (
        <div className="flex flex-col gap-6">
            <PageHeader
                title="Settings"
                description="Your sign-in and account security."
                breadcrumb={[{ href: ADMIN_DASHBOARD, label: "Dashboard" }, { label: "Settings" }]}
            />
            <AccountSettings />
        </div>
    )
}
