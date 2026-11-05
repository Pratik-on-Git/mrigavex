import type { Metadata } from "next"
import { Suspense } from "react"
import TrashView from "@/components/Application/Admin/TrashView"
import { Skeleton } from "@/components/ui/skeleton"

export const metadata: Metadata = { title: "Trash" }

// /admin/trash?trashof=<entity> (EnergyFlow pattern). Only "leads" today;
// new entities register in TrashView's TRASH_CONFIG.
export default function TrashPage() {
    return (
        <Suspense fallback={<Skeleton className="h-96 rounded-xl" />}>
            <TrashView />
        </Suspense>
    )
}
