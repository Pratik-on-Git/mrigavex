import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import LenisProvider from "@/components/Application/LenisProvider"
import { Toaster } from "@/components/ui/sonner"
import { SITE } from "@/lib/site"
import { cn } from "@/lib/utils"
import "./globals.css"

// Geist is the typeface for the whole app (public site, auth and admin);
// Geist Mono for codes, references and figures. Exposed as CSS variables and
// mapped to Tailwind's font-sans / font-mono in globals.css.
const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"], display: "swap" })
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"], display: "swap" })

export const metadata: Metadata = {
    metadataBase: new URL(SITE.url),
    title: { default: SITE.title, template: `%s | ${SITE.name}` },
    description: SITE.description,
    applicationName: SITE.name,
    // Canonicals are declared per public page so private routes never
    // inherit one pointing at the home page.
    robots: { index: true, follow: true },
    openGraph: {
        type: "website",
        locale: SITE.locale,
        siteName: SITE.name,
        title: SITE.title,
        description: SITE.description,
        url: SITE.url,
    },
    twitter: { card: "summary_large_image" },
}

export const viewport: Viewport = {
    // Browser chrome matches the top navigation.
    themeColor: "#00010d",
}

export default function RootLayout({ children }: LayoutProps<"/">) {
    return (
        <html lang="en" className={cn("antialiased", geistSans.variable, geistMono.variable)}>
            {/* min-h-svh, not min-h-full: Lenis sets html { height: auto }. */}
            <body className="flex min-h-svh flex-col bg-background font-sans text-foreground">
                {/* Smooth scrolling everywhere (public site, auth, admin). */}
                <LenisProvider>{children}</LenisProvider>
                <Toaster position="top-center" richColors closeButton />
            </body>
        </html>
    )
}
