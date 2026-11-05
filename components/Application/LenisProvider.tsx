"use client"

import { Suspense, useEffect, useLayoutEffect, useRef, type ReactNode } from "react"
import { usePathname } from "next/navigation"
import { ReactLenis, useLenis } from "lenis/react"
import type Lenis from "lenis"
import type { LenisOptions } from "lenis"

// Global smooth scrolling (Lenis 1.3, https://lenis.dev). One instance on the
// <html> scroller (`root`), shared via useLenis(); the page itself still
// scrolls natively, so position: sticky/fixed, find-in-page, keyboard
// scrolling and focus scrolling all keep working (Lenis re-syncs on them).
//
// Defined once at module level: <ReactLenis> rebuilds the instance whenever
// the serialised options change, so they must be stable.
const LENIS_OPTIONS: LenisOptions = {
    autoRaf: true,
    // Same-page #links scroll smoothly and honour CSS scroll-margin-top, so
    // the global `[id] { scroll-margin-top }` keeps targets below the sticky
    // header. Use plain <a href="#id"> for these (see PageHero), not <Link>.
    anchors: true,
    // Scrollable children (admin sidebar, sheets, dialogs, tables, menus,
    // textareas) scroll natively instead of moving the page.
    allowNestedScroll: true,
    // A link to another page kills any inertia still running.
    stopInertiaOnNavigate: true,
    // prefers-reduced-motion: no smoothing, instant scrollTo/anchors (live).
    respectReducedMotion: true,
    // Touch stays fully native (syncTouch off: iOS < 16 issues, battery).
    syncTouch: false,
    // autoToggle is deliberately OFF — see ScrollLockSync below.
    autoToggle: false,
}

export default function LenisProvider({ children }: { children: ReactNode }) {
    return (
        <ReactLenis root options={LENIS_OPTIONS}>
            <ScrollLockSync />
            {/* usePathname is request data under Cache Components → Suspense. */}
            <Suspense fallback={null}>
                <RouteSync />
            </Suspense>
            {children}
        </ReactLenis>
    )
}

// ── Modals, sheets, menus ─────────────────────────────────────────────
// Overlays (Base UI dialogs/sheets/menus, or anything else) lock the page by
// setting overflow hidden/clip on <html> or <body>. Lenis must pause then, or
// wheel input would keep scrolling the page behind the overlay (a programmatic
// scrollTo still moves an overflow:hidden element).
//
// Why not Lenis' own `autoToggle`: it relies on CSS `transition-behavior:
// allow-discrete` (Safari ≥ 17.4, Firefox ≥ 129) — older browsers would never
// pause — and its stop()/start() write inline `overflow` on <html>, which
// fights the overlay's own lock. This observer works everywhere and only
// reads: whoever locked the page also unlocks it.
const isPageLocked = () => {
    const html = document.documentElement
    const htmlOverflow = getComputedStyle(html).overflowY
    // <body>'s overflow only reaches the viewport when <html> doesn't set one
    // (same rule Base UI's scroll lock uses).
    const viewportOverflow = htmlOverflow !== "visible" ? htmlOverflow : getComputedStyle(document.body).overflowY
    return viewportOverflow === "hidden" || viewportOverflow === "clip"
}

function ScrollLockSync() {
    const lenis = useLenis()

    useEffect(() => {
        if (!lenis) return
        const sync = () => {
            const locked = isPageLocked()
            if (locked && !lenis.isStopped) lenis.stop()
            else if (!locked && lenis.isStopped) lenis.start() // start() re-reads the real scroll position
        }
        const observer = new MutationObserver(sync)
        // <html>: only style + Base UI's marker (Lenis rewrites html's class on
        // every scroll frame, which must not trigger style reads).
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ["style", "data-base-ui-scroll-locked"] })
        // <body>: any attribute (other libraries lock via class/data-* + CSS).
        observer.observe(document.body, { attributes: true })
        sync()
        return () => observer.disconnect()
    }, [lenis])

    return null
}

// ── Route changes ─────────────────────────────────────────────────────
// Lenis ignores native scroll events while it's animating. If a navigation
// happens mid-glide (router.push from a table row, back/forward, a redirect)
// Next's scroll-to-top/restoration would be overwritten by the next Lenis
// frame. So: on a new pathname, before paint, adopt wherever Next scrolled to
// and drop the glide; on back/forward, drop it before the browser restores.
// Query-only changes (admin filters use scroll:false) are left alone.
const halt = (lenis: Lenis) => {
    if (lenis.isStopped) return // an overlay owns the scroll right now
    lenis.scrollTo(lenis.actualScroll, { immediate: true, force: true })
}

function RouteSync() {
    const lenis = useLenis()
    const pathname = usePathname()
    const previous = useRef(pathname)

    // Layout effect: runs in the same commit as Next's own scroll handling
    // (which lives deeper in the tree, so it runs first) and before paint.
    useLayoutEffect(() => {
        if (!lenis || previous.current === pathname) return
        previous.current = pathname
        if (lenis.isScrolling === "smooth") halt(lenis)
        // New page, new height: autoResize catches it via ResizeObserver, but
        // measuring now avoids one frame with the old scroll limit.
        lenis.resize()
    }, [lenis, pathname])

    useEffect(() => {
        if (!lenis) return
        const onPopState = () => {
            if (lenis.isScrolling === "smooth") halt(lenis)
        }
        window.addEventListener("popstate", onPopState)
        return () => window.removeEventListener("popstate", onPopState)
    }, [lenis])

    return null
}
