import { HOME_CONTENT } from "@/lib/content/home"
import ArrowCircle from "./ArrowCircle"
import ParticleGraphic from "./particles/ParticleGraphic"

const { vision } = HOME_CONTENT

// TODO(content): the design's background is a heavily blurred image that isn't
// in the project yet ("ChatGPT Image Sep 21, 2026"). These gradients stand in
// for it; a CSS gradient is already what a 24px blur of it looks like.
const BACKDROP = [
    "radial-gradient(55% 35% at 12% 0%, #6a7be0 0%, transparent 72%)",
    "radial-gradient(45% 32% at 100% 4%, #7a6ad6 0%, transparent 72%)",
    "radial-gradient(38% 45% at 100% 88%, #8c8b6c 0%, transparent 74%)",
    "radial-gradient(38% 40% at 0% 92%, #5b60ae 0%, transparent 74%)",
    "linear-gradient(180deg, #5b60ae 0%, #2a1673 26%, #090720 52%, #171648 100%)",
].join(", ")

// Dark section: "Think Clearly. Move Deliberately." and the four stages.
export default function Vision() {
    return (
        <section aria-labelledby="vision-title" className="text-white" style={{ background: BACKDROP }}>
            <div className="site-wrap py-16 md:py-[100px]">
                <div className="flex flex-wrap items-center justify-between gap-6">
                    <p className="text-xs font-medium uppercase">{vision.eyebrow}</p>
                    <a
                        href="#contact"
                        className="flex h-14 items-center justify-center gap-2.5 rounded-lg bg-[linear-gradient(97.63deg,rgba(32,36,99,0.59)_0%,rgba(56,115,160,0.59)_100%)] px-6 font-medium whitespace-nowrap transition-opacity hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                    >
                        {vision.cta}
                        <ArrowCircle className="bg-white text-mx-navy" />
                    </a>
                </div>

                <p className="mt-10 text-[19.2px] leading-[25px] md:mt-6">
                    {vision.intro.map((line) => (
                        <span key={line} className="block">
                            {line}
                        </span>
                    ))}
                </p>

                <h2 id="vision-title" className="mt-10 flex flex-col gap-5 text-[clamp(3rem,6.72vw,5.625rem)] leading-[0.95] font-medium tracking-[-0.025em] md:mt-[50px] md:leading-[0.91]">
                    <span className="text-[#F7F7F7]">{vision.title[0]}</span>
                    <span className="text-[#BCC0FF]">{vision.title[1]}</span>
                </h2>

                <ol className="mt-12 grid gap-8 sm:grid-cols-2 md:mt-[75px] lg:grid-cols-4 lg:gap-3">
                    {vision.steps.map((step) => (
                        <li key={step.title}>
                            <div className="relative isolate aspect-square overflow-hidden rounded-2xl bg-mx-navy">
                                <ParticleGraphic src={step.image.src} behaviour={step.particles} />
                                {step.tint && <div aria-hidden className="pointer-events-none absolute inset-0 mix-blend-color" style={{ backgroundColor: step.tint }} />}
                            </div>
                            <h3 className="mt-4 text-2xl leading-none font-semibold tracking-[-0.025em] text-[#F7F7F7] uppercase">{step.title}</h3>
                            <p className="mt-6 text-[19.2px] leading-[25px]">{step.body}</p>
                        </li>
                    ))}
                </ol>
            </div>
        </section>
    )
}
