import Link from "next/link"
import { SITE } from "@/lib/site"
import { WEBSITE_HOME } from "@/routes/WebsiteRoute"
import HeaderNav from "./HeaderNav"
import Logo from "./Logo"

// 72px sticky bar from the design, with the page blurred behind it.
const Header = () => (
    <header className="sticky top-0 z-50 bg-mx-ink/95 backdrop-blur-[17px]">
        <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-4 focus:z-50 focus:rounded-md focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:text-black"
        >
            Skip to content
        </a>
        <div className="site-wrap flex h-[72px] items-center justify-between">
            <Link href={WEBSITE_HOME} aria-label={`${SITE.name} home`}>
                <Logo />
            </Link>
            <HeaderNav />
        </div>
    </header>
)

export default Header
