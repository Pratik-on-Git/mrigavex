"use client"

import { Suspense, useState, type ReactNode } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { ExternalLinkIcon, Loader2Icon, LogOutIcon, MenuIcon } from "lucide-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { QUERY_KEYS, fetchMe, fetchStats } from "@/lib/adminQueries"
import { adminNavItems } from "@/lib/adminSidebarMenu"
import { SITE } from "@/lib/site"
import { cn } from "@/lib/utils"
import { WEBSITE_HOME } from "@/routes/WebsiteRoute"

const isActive = (pathname: string | null, match: string) => Boolean(pathname) && (pathname === match || pathname!.startsWith(`${match}/`))

const Brand = ({ className }: { className?: string }) => (
    <Link href={adminNavItems[0].href} className={cn("text-sm font-semibold tracking-tight", className)}>
        {SITE.name} <span className="font-normal text-muted-foreground">· Admin</span>
    </Link>
)

// Admin chrome: fixed sidebar on desktop, top bar + drawer on phones.
// Anything reading the URL (active item, drawer auto-close) sits behind
// Suspense — under Cache Components the frame itself prerenders statically.
export default function AdminShell({ children }: { children: ReactNode }) {
    return (
        <div className="flex min-h-svh flex-1 bg-muted/40">
            <a
                href="#admin-content"
                className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus:z-50 focus:rounded-md focus:bg-foreground focus:px-3 focus:py-2 focus:text-sm focus:text-background"
            >
                Skip to content
            </a>

            <aside className="sticky top-0 hidden h-svh w-60 shrink-0 flex-col border-r border-border bg-background lg:flex">
                <div className="flex h-16 items-center px-5">
                    <Brand />
                </div>
                <Suspense fallback={<AdminNav pathname={null} />}>
                    <ActiveAdminNav />
                </Suspense>
                <AccountBox />
            </aside>

            <div className="flex min-w-0 flex-1 flex-col">
                <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background/90 px-4 backdrop-blur lg:hidden">
                    <Brand />
                    <Suspense fallback={<span className="size-9" aria-hidden />}>
                        <MobileMenu />
                    </Suspense>
                </header>

                <main id="admin-content" tabIndex={-1} className="mx-auto outline-none w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
                    {children}
                </main>
            </div>
        </div>
    )
}

function ActiveAdminNav() {
    return <AdminNav pathname={usePathname()} />
}

function MobileMenu() {
    const pathname = usePathname()
    const [open, setOpen] = useState(false)

    // Close the drawer whenever the route changes (incl. back/forward),
    // adjusted during render rather than in an effect.
    const [lastPath, setLastPath] = useState(pathname)
    if (lastPath !== pathname) {
        setLastPath(pathname)
        setOpen(false)
    }

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger className="inline-flex size-9 items-center justify-center rounded-md hover:bg-muted" aria-label="Open menu">
                <MenuIcon className="size-5" />
            </SheetTrigger>
            <SheetContent side="left" className="w-72 gap-0 p-0">
                <SheetHeader className="h-14 justify-center border-b border-border px-5">
                    <SheetTitle className="text-sm">{SITE.name} · Admin</SheetTitle>
                </SheetHeader>
                <AdminNav pathname={pathname} />
                <AccountBox />
            </SheetContent>
        </Sheet>
    )
}

function AdminNav({ pathname }: { pathname: string | null }) {
    // Unread count for the Leads badge; refreshed every minute and on focus.
    const { data: stats } = useQuery({ queryKey: QUERY_KEYS.stats, queryFn: fetchStats, refetchInterval: 60_000 })
    const unread = stats?.unread ?? 0

    return (
        <nav aria-label="Admin" className="flex-1 overflow-y-auto px-3 py-3">
            <ul className="flex flex-col gap-0.5">
                {adminNavItems.map((item) => {
                    const active = isActive(pathname, item.match)
                    const Icon = item.icon
                    return (
                        <li key={item.href}>
                            <Link
                                href={item.href}
                                aria-current={active ? "page" : undefined}
                                className={cn(
                                    "flex h-9 items-center gap-3 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                                    active && "bg-muted text-foreground"
                                )}
                            >
                                <Icon className="size-4" aria-hidden />
                                <span className="flex-1">{item.title}</span>
                                {item.badge === "unread" && unread > 0 && (
                                    <span className="min-w-5 rounded-full bg-foreground px-1.5 text-center font-mono text-[11px] leading-5 text-background">
                                        <span className="sr-only">Unread: </span>
                                        {unread > 99 ? "99+" : unread}
                                    </span>
                                )}
                            </Link>
                        </li>
                    )
                })}
            </ul>
        </nav>
    )
}

function AccountBox() {
    const { data: me } = useQuery({ queryKey: QUERY_KEYS.me, queryFn: fetchMe, staleTime: 5 * 60_000 })
    const [signingOut, setSigningOut] = useState(false)

    const signOut = async () => {
        setSigningOut(true)
        await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" }).catch(() => undefined)
        // Hard navigation: drops every cached admin query from memory.
        window.location.replace("/auth/login")
    }

    return (
        <div className="border-t border-border p-3">
            <p className="truncate px-2 text-xs text-muted-foreground" title={me?.email}>
                {me?.email ?? " "}
            </p>
            <div className="mt-2 flex gap-1">
                <Link
                    href={WEBSITE_HOME}
                    target="_blank"
                    className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                    <ExternalLinkIcon className="size-3.5" aria-hidden /> View site
                </Link>
                <button
                    type="button"
                    onClick={signOut}
                    disabled={signingOut}
                    className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-60"
                >
                    {signingOut ? <Loader2Icon className="size-3.5 animate-spin" aria-hidden /> : <LogOutIcon className="size-3.5" aria-hidden />}
                    Sign out
                </button>
            </div>
        </div>
    )
}
