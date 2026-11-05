import type { Metadata } from "next"
import Footer from "@/components/Application/Website/Footer"
import Header from "@/components/Application/Website/Header"
import NotFoundContent from "@/components/Application/Website/NotFoundContent"

export const metadata: Metadata = {
    title: "Page not found",
    robots: { index: false, follow: true },
}

// Unmatched URLs anywhere outside /admin land here (the admin portal has its
// own 404 that keeps the sidebar), so it carries the public site chrome.
export default function NotFound() {
    return (
        <div id="top" className="flex flex-1 flex-col scroll-mt-0 bg-mx-deep">
            <Header />
            <main id="main-content" tabIndex={-1} className="flex-1 outline-none">
                <NotFoundContent />
            </main>
            <Footer />
        </div>
    )
}
