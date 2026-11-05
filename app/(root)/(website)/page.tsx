import type { Metadata } from "next"
import ContactSection from "@/components/Application/Website/home/ContactSection"
import Expertise from "@/components/Application/Website/home/Expertise"
import HomeHero from "@/components/Application/Website/home/HomeHero"
import Leadership from "@/components/Application/Website/home/Leadership"
import Perspective from "@/components/Application/Website/home/Perspective"
import Vision from "@/components/Application/Website/home/Vision"
import { SITE } from "@/lib/site"
import { WEBSITE_HOME } from "@/routes/WebsiteRoute"

export const metadata: Metadata = {
    alternates: { canonical: WEBSITE_HOME },
    openGraph: { title: SITE.title, description: SITE.description, url: WEBSITE_HOME },
}

// The whole site, from the Figma "MRIGAVEX_2_WEBSITE" frame. Static except the
// contact form, which reads ?for= on the client behind Suspense. Copy and
// images: lib/content/home.ts.
export default function HomePage() {
    return (
        <>
            <HomeHero />
            <Perspective />
            <Expertise />
            <Vision />
            <Leadership />
            <ContactSection />
        </>
    )
}
