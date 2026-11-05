import { ArrowRightIcon, Link2Icon } from "lucide-react"
import { HOME_CONTENT } from "@/lib/content/home"
import ArrowCircle from "./ArrowCircle"
import ParticleGraphic from "./particles/ParticleGraphic"
import TopicLink from "./TopicLink"

const { expertise, practice } = HOME_CONTENT

// Light section: the three practice cards, then "Expertise that connects".
// Each card's button and each practice link sends the visitor to the contact
// form with that topic: the design has no detail pages for them to open yet.
export default function Expertise() {
    return (
        <section id="expertise" aria-labelledby="expertise-title" className="bg-mx-mist text-mx-navy">
            <div className="site-wrap py-16 md:py-[100px]">
                <p className="text-xs font-medium uppercase">{expertise.eyebrow}</p>

                <div className="mt-10 flex flex-col gap-6 md:mt-[50px] lg:flex-row lg:items-end lg:justify-between">
                    <h2 id="expertise-title" className="flex flex-col gap-[15.84px] text-[clamp(2.25rem,4.73vw,3.96rem)] leading-[1] tracking-[-0.025em] md:leading-[0.91]">
                        <span className="text-black">{expertise.title[0]}</span>
                        <span className="font-medium text-mx-indigo">{expertise.title[1]}</span>
                    </h2>
                    <p className="max-w-[330px] text-xl leading-[26px]">{expertise.support}</p>
                </div>

                <ul className="mt-10 grid gap-6 md:mt-[50px] lg:grid-cols-3">
                    {expertise.cards.map((card) => (
                        <li key={card.id} id={card.id} className="flex flex-col overflow-hidden rounded-2xl bg-mx-navy">
                            <div className="relative aspect-[364/286]">
                                <ParticleGraphic src={card.image.src} behaviour={card.particles} />
                            </div>
                            <div className="flex flex-1 flex-col p-6">
                                <h3 className="text-[clamp(1.75rem,2.7vw,2.25rem)] leading-none tracking-[-0.025em] text-[#F7F7F7] lg:min-h-[108px]">{card.title}</h3>
                                <p className="mt-6 mb-8 leading-[21px] text-mx-sky">{card.body}</p>
                                <TopicLink
                                    topic={card.topic}
                                    className="mt-auto flex h-14 items-center justify-between gap-2.5 rounded-lg bg-white px-6 font-medium text-mx-navy transition-colors hover:bg-mx-mist focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                                >
                                    {card.cta}
                                    <ArrowCircle className="bg-mx-navy text-white" />
                                </TopicLink>
                            </div>
                        </li>
                    ))}
                </ul>

                <div id="practice" className="mt-16 grid gap-10 border-t-2 border-mx-rule pt-16 md:mt-[75px] md:pt-[75px] lg:grid-cols-[470px_1fr] lg:gap-[99px]">
                    <div>
                        <p className="text-xs font-medium uppercase">{practice.eyebrow}</p>
                        <h2 className="mt-10 text-[clamp(2.25rem,3.73vw,3.125rem)] leading-[1.2] font-medium tracking-[-0.025em] md:mt-[50px]">
                            {practice.titleStart}{" "}
                            <span className="inline-flex translate-y-[-0.08em] items-center gap-2 align-middle">
                                <Link2Icon className="size-[45px] -rotate-45 text-[#318ED5]" strokeWidth={2.25} aria-hidden />
                                <a
                                    href="#contact"
                                    className="flex h-14 items-center rounded-full bg-[linear-gradient(95.03deg,#318ED5_0%,#8187EA_100%)] px-[33px] text-base font-medium tracking-normal whitespace-nowrap text-white transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mx-navy"
                                >
                                    {practice.pill}
                                </a>
                            </span>{" "}
                            {practice.titleEnd}
                        </h2>
                        <p className="mt-9 max-w-[470px] text-xl leading-[26px] text-mx-cobalt">{practice.body}</p>
                    </div>

                    <ul className="flex flex-col justify-center">
                        {practice.links.map((link) => (
                            <li key={link.label} className="border-b border-mx-rule">
                                <TopicLink
                                    topic={link.topic}
                                    className="group flex items-center justify-between gap-6 py-7 text-lg font-medium transition-colors hover:text-mx-cobalt focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mx-navy"
                                >
                                    {link.label}
                                    <ArrowRightIcon className="size-5 shrink-0 transition-transform group-hover:translate-x-1" strokeWidth={1.5} aria-hidden />
                                </TopicLink>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </section>
    )
}
