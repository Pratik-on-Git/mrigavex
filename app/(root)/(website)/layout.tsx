import Footer from "@/components/Application/Website/Footer"
import Header from "@/components/Application/Website/Header"

// Public site chrome. Static: nothing here reads request data, so the public
// page prerenders. #top is the target of the footer's "Back to top" link.
export default function WebsiteLayout({ children }: LayoutProps<"/">) {
    return (
        <div id="top" className="flex flex-1 flex-col scroll-mt-0 bg-mx-deep">
            <Header />
            <main id="main-content" tabIndex={-1} className="flex-1 outline-none">
                {children}
            </main>
            <Footer />
        </div>
    )
}
