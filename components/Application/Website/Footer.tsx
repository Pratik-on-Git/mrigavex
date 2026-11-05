import { ArrowUpIcon } from "lucide-react"
import { HOME_CONTENT } from "@/lib/content/home"
import { SITE } from "@/lib/site"
import { cn } from "@/lib/utils"
import Logo from "./Logo"

const { footer } = HOME_CONTENT

// Static footer. The copyright year is fixed copy from the design: with Cache
// Components a render-time clock read would block prerendering.
const Footer = () => (
    <footer className="bg-mx-ink text-white">
        <div className="site-wrap grid gap-10 py-14 md:grid-cols-3 md:items-end">
            <div>
                <Logo className="h-8" />
                <p className="mt-3 text-lg font-semibold tracking-[0.3em]">{SITE.name}</p>
            </div>
            <p className="text-sm leading-[1.4] text-mx-slate">
                {footer.tagline.map((line) => (
                    <span key={line} className="block">
                        {line}
                    </span>
                ))}
            </p>
            <a
                href="#top"
                className={cn(
                    "flex w-fit flex-col items-start gap-2 text-xs text-mx-slate transition-colors hover:text-white md:items-end md:justify-self-end",
                    "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-mx-lilac"
                )}
            >
                <ArrowUpIcon className="size-5" aria-hidden />
                Back to top
            </a>
        </div>
        <div className="border-t border-white/10">
            <div className="site-wrap flex flex-col gap-2 py-5 text-xs text-[#717171] md:grid md:grid-cols-3">
                <p>{footer.copyright}</p>
                <p>{footer.location}</p>
                <p className="md:text-right">{footer.strapline}</p>
            </div>
        </div>
    </footer>
)

export default Footer
