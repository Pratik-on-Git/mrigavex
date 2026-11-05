import Link from "next/link"
import type { ComponentType, ReactNode } from "react"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type Action = { label: string; href?: string; onClick?: () => void }

type AdminEmptyStateProps = {
    icon: ComponentType<{ className?: string }>
    title: string
    description?: ReactNode
    tone?: "neutral" | "danger"
    action?: Action
    className?: string
}

// Empty / error / not-found placeholder used across admin screens.
const AdminEmptyState = ({ icon: Icon, title, description, tone = "neutral", action, className }: AdminEmptyStateProps) => (
    <div className={cn("flex flex-col items-center justify-center px-6 py-14 text-center", className)}>
        <span
            className={cn(
                "mb-4 flex size-12 items-center justify-center rounded-full",
                tone === "danger" ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"
            )}
        >
            <Icon className="size-5" />
        </span>
        <h2 className="text-base font-semibold">{title}</h2>
        {description && <div className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</div>}
        {action &&
            (action.href ? (
                <Link href={action.href} className={cn(buttonVariants({ variant: "outline" }), "mt-5")}>
                    {action.label}
                </Link>
            ) : (
                <button type="button" onClick={action.onClick} className={cn(buttonVariants({ variant: "outline" }), "mt-5")}>
                    {action.label}
                </button>
            ))}
    </div>
)

export default AdminEmptyState
