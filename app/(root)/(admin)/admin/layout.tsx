import type { Metadata } from "next"
import AdminProviders from "@/components/Application/Admin/AdminProviders"
import AdminShell from "@/components/Application/Admin/AdminShell"

export const metadata: Metadata = {
    title: { default: "Admin", template: "%s · Admin" },
    robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false, noimageindex: true } },
}

// Static shell: no cookies or DB here (Cache Components would require a
// Suspense boundary, and it would hold every admin page behind the request).
// Access is enforced by proxy.ts (redirect) and requireAdmin() in every
// /api route the client components call.
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
    return (
        <AdminProviders>
            <AdminShell>{children}</AdminShell>
        </AdminProviders>
    )
}
