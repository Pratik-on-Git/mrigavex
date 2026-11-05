import type { Metadata } from "next"

export const metadata: Metadata = {
    title: "Sign in",
    robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
}

// Auth pages sit outside the public site chrome: one centred card.
export default function AuthLayout({ children }: LayoutProps<"/auth">) {
    return <main className="flex min-h-svh flex-1 items-center justify-center bg-muted/40 px-4 py-10">{children}</main>
}
