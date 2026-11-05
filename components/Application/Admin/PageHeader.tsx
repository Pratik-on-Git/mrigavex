import Link from "next/link"
import type { ReactNode } from "react"
import { ChevronRightIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export type Crumb = { href?: string; label: string }

type PageHeaderProps = {
    title: string
    description?: string
    actions?: ReactNode
    breadcrumb?: Crumb[]
    className?: string
}

// Title row for every admin page (EnergyFlow Admin/PageHeader + BreadCrumb).
const PageHeader = ({ title, description, actions, breadcrumb, className }: PageHeaderProps) => (
    <div className={cn("flex flex-col gap-3", className)}>
        {breadcrumb && breadcrumb.length > 0 && (
            <nav aria-label="Breadcrumb">
                <ol className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
                    {breadcrumb.map((crumb, index) => {
                        const last = index === breadcrumb.length - 1
                        return (
                            <li key={`${crumb.label}-${index}`} className="flex items-center gap-1">
                                {crumb.href && !last ? (
                                    <Link href={crumb.href} className="hover:text-foreground">
                                        {crumb.label}
                                    </Link>
                                ) : (
                                    <span aria-current={last ? "page" : undefined} className={cn(last && "font-medium text-foreground")}>
                                        {crumb.label}
                                    </span>
                                )}
                                {!last && <ChevronRightIcon className="size-3.5" aria-hidden />}
                            </li>
                        )
                    })}
                </ol>
            </nav>
        )}
        <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0">
                <h1 className="text-xl font-semibold tracking-tight break-words sm:text-2xl">{title}</h1>
                {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
            </div>
            {actions && <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">{actions}</div>}
        </div>
    </div>
)

export default PageHeader
