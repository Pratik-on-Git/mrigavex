"use client"

import { useEffect, useState } from "react"
import { MenuIcon } from "lucide-react"
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import { WEBSITE_CONTACT } from "@/routes/WebsiteRoute"

const NAV = [
    { id: "about", label: "About" },
    { id: "financial-services", label: "Fintech" },
    { id: "expertise", label: "Services" },
    { id: "practice", label: "Sectors" },
    { id: "leadership", label: "Leadership" },
]

// Plain <a> rooted at "/": Lenis glides to the anchor on the home page, and the
// browser navigates there from anywhere else.
const hrefOf = (id: string) => `/#${id}`

// The section under the middle of the screen. A target can sit inside another
// (the Fintech card is in Services), so the one latest in the document wins.
function useActiveSection() {
    const [active, setActive] = useState(NAV[0].id)

    useEffect(() => {
        const targets = NAV.map((item) => document.getElementById(item.id))
            .filter((node): node is HTMLElement => Boolean(node))
            .sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1))
        const visible = new Set<Element>()

        const observer = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (entry.isIntersecting) visible.add(entry.target)
                    else visible.delete(entry.target)
                }
                const current = targets.filter((node) => visible.has(node)).at(-1)
                if (current) setActive(current.id)
                // Back above the first section (the hero): nothing is in the band.
                else if (targets[0] && targets[0].getBoundingClientRect().top > window.innerHeight / 2) setActive(NAV[0].id)
            },
            { rootMargin: "-45% 0px -50% 0px" }
        )
        targets.forEach((node) => observer.observe(node))
        return () => observer.disconnect()
    }, [])

    return active
}

const letsTalkClass =
    "flex h-[41px] items-center justify-center rounded-lg bg-[linear-gradient(97.63deg,#202463_0%,#0A0D39_100%)] px-5 text-xs font-medium text-mx-lilac transition-opacity hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mx-lilac"

export default function HeaderNav() {
    const active = useActiveSection()
    const [open, setOpen] = useState(false)

    return (
        <>
            {/* Desktop: links + Let's Talk, 50px apart as designed. */}
            <div className="hidden items-center gap-[50px] md:flex">
                <nav aria-label="Main">
                    <ul className="flex items-center gap-6">
                        {NAV.map((item) => (
                            <li key={item.id}>
                                <a
                                    href={hrefOf(item.id)}
                                    aria-current={active === item.id ? "true" : undefined}
                                    className={cn(
                                        "text-xs font-medium transition-colors hover:text-mx-lilac focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-mx-lilac",
                                        active === item.id ? "text-mx-lilac" : "text-[#717171]"
                                    )}
                                >
                                    {item.label}
                                </a>
                            </li>
                        ))}
                    </ul>
                </nav>
                <a href={WEBSITE_CONTACT} className={letsTalkClass}>
                    Let&apos;s Talk
                </a>
            </div>

            {/* Phones: Let's Talk stays visible, the links move into a sheet. */}
            <div className="flex items-center gap-3 md:hidden">
                <a href={WEBSITE_CONTACT} className={letsTalkClass}>
                    Let&apos;s Talk
                </a>
                <Sheet open={open} onOpenChange={setOpen}>
                    <SheetTrigger aria-label="Open menu" className="flex size-10 items-center justify-center rounded-lg text-mx-lilac">
                        <MenuIcon className="size-5" aria-hidden />
                    </SheetTrigger>
                    <SheetContent side="right" className="border-mx-line/40 bg-mx-ink p-6 text-white [&_[data-slot=sheet-close]]:text-white">
                        <SheetTitle className="text-sm font-medium text-mx-lilac">Menu</SheetTitle>
                        <nav aria-label="Mobile">
                            <ul className="mt-4 flex flex-col">
                                {NAV.map((item) => (
                                    <li key={item.id} className="border-b border-white/10">
                                        <a href={hrefOf(item.id)} onClick={() => setOpen(false)} className="block py-4 text-lg font-medium">
                                            {item.label}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </nav>
                    </SheetContent>
                </Sheet>
            </div>
        </>
    )
}
