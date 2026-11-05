import Image from "next/image"
import { ArrowUpRightIcon } from "lucide-react"
import { HOME_CONTENT } from "@/lib/content/home"

const { leadership } = HOME_CONTENT

// Founder section. The pasted spec ended before this block, so its measurements
// are read from the design screenshot and use the same type scale as the rest.
export default function Leadership() {
    return (
        <section id="leadership" aria-labelledby="leadership-title" className="bg-mx-mist text-mx-navy">
            <div className="site-wrap py-16 md:py-[100px]">
                <div className="grid gap-10 lg:grid-cols-[minmax(0,470px)_1fr] lg:gap-[50px]">
                    <Image
                        src={leadership.portrait.src}
                        alt={leadership.portrait.alt}
                        width={leadership.portrait.width}
                        height={leadership.portrait.height}
                        sizes="(min-width: 510px) 470px, 100vw"
                        className="h-auto w-full max-w-[470px]"
                    />

                    <div className="flex flex-col">
                        <p className="text-xs font-medium uppercase">{leadership.eyebrow}</p>
                        <h2 id="leadership-title" className="mt-10 flex flex-col gap-3 text-[clamp(2.25rem,4.73vw,3.96rem)] leading-[1] tracking-[-0.025em] md:mt-[50px]">
                            <span className="text-mx-soft">{leadership.title[0]}</span>
                            <span>{leadership.title[1]}</span>
                        </h2>
                        <div className="mt-8 border-t border-mx-rule pt-8">
                            <h3 className="text-[clamp(1.75rem,2.7vw,2.25rem)] leading-none tracking-[-0.025em]">{leadership.name}</h3>
                            <p className="mt-4 text-xl leading-[26px]">{leadership.role}</p>
                        </div>
                        {leadership.moreHref && (
                            <a
                                href={leadership.moreHref}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-8 flex h-14 w-fit items-center gap-2.5 rounded-lg border border-mx-navy/30 px-6 font-medium transition-colors hover:bg-white/40"
                            >
                                {leadership.moreLabel}
                                <ArrowUpRightIcon className="size-5" strokeWidth={1.5} aria-hidden />
                            </a>
                        )}
                    </div>
                </div>

                <div className="mt-10 grid gap-6 leading-[1.45] md:mt-[50px] md:grid-cols-2 md:gap-[50px]">
                    {leadership.bio.map((paragraph) => (
                        <p key={paragraph}>{paragraph}</p>
                    ))}
                </div>
            </div>
        </section>
    )
}
