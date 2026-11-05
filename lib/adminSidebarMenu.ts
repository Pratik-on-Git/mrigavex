import { LayoutDashboardIcon, InboxIcon, Trash2Icon, SettingsIcon, type LucideIcon } from "lucide-react"
import { ADMIN_DASHBOARD, ADMIN_LEADS_SHOW, ADMIN_SETTINGS, ADMIN_TRASH, ADMIN_TRASH_OF } from "@/routes/AdminPanelRoute"

// Admin navigation (EnergyFlow lib/adminSidebarMenu.js). `match` is the path
// prefix that marks the item active; `badge` names a live counter.
export type AdminNavItem = { title: string; href: string; match: string; icon: LucideIcon; badge?: "unread" }

export const adminNavItems: AdminNavItem[] = [
    { title: "Dashboard", href: ADMIN_DASHBOARD, match: ADMIN_DASHBOARD, icon: LayoutDashboardIcon },
    { title: "Leads", href: ADMIN_LEADS_SHOW, match: ADMIN_LEADS_SHOW, icon: InboxIcon, badge: "unread" },
    { title: "Trash", href: ADMIN_TRASH_OF("leads"), match: ADMIN_TRASH, icon: Trash2Icon },
    { title: "Settings", href: ADMIN_SETTINGS, match: ADMIN_SETTINGS, icon: SettingsIcon },
]
