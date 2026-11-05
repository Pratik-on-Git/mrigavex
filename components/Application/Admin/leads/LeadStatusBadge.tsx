import { statusMeta } from "@/lib/leadConfig"
import { cn } from "@/lib/utils"

const TONE_CLASSES = {
    info: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
    warning: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
    success: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    muted: "bg-muted text-muted-foreground",
} as const

const LeadStatusBadge = ({ status, className }: { status: string; className?: string }) => {
    const meta = statusMeta(status)
    return (
        <span className={cn("inline-flex h-6 items-center rounded-full px-2.5 text-xs font-medium whitespace-nowrap", TONE_CLASSES[meta.tone], className)}>
            {meta.label}
        </span>
    )
}

export default LeadStatusBadge
