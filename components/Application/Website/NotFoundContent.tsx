import Link from "next/link"
import { WEBSITE_CONTACT, WEBSITE_HOME } from "@/routes/WebsiteRoute"

export default function NotFoundContent() {
    return (
        <section className="site-wrap flex flex-col items-start py-24 text-white sm:py-32">
            <p className="text-xs font-medium tracking-wide text-mx-lilac/75 uppercase">404</p>
            <h1 className="mt-4 text-[clamp(2.5rem,5vw,4rem)] leading-none tracking-[-0.025em]">This page doesn&apos;t exist.</h1>
            <p className="mt-5 max-w-lg text-lg text-mx-slate">It may have moved. Try one of these instead.</p>
            <div className="mt-8 flex flex-wrap gap-3">
                <Link href={WEBSITE_HOME} className="flex h-14 items-center rounded-lg bg-white px-6 font-medium text-mx-navy transition-opacity hover:opacity-90">
                    Home
                </Link>
                <a href={WEBSITE_CONTACT} className="flex h-14 items-center rounded-lg border border-mx-line px-6 font-medium text-mx-lilac transition-colors hover:bg-white/5">
                    Contact
                </a>
            </div>
        </section>
    )
}
