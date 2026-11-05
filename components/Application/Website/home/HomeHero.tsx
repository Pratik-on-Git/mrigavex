import Image from "next/image"
import { GlobeIcon, PlusIcon } from "lucide-react"
import { HOME_CONTENT } from "@/lib/content/home"
import ArrowCircle from "./ArrowCircle"

const { hero } = HOME_CONTENT

// Matches the horse's width below: limited by the screen's height or width.
const HORSE_SIZES = "(min-width: 768px) min(69vw, 108vh), 100vw"

// Hero, a 1340×750 frame in the design: 665px of art and copy above an 85px
// pathway row. bg.png and Object.png are 2× exports of that frame (measured against
// the Figma export), not the raw layers, so the layer sizes in the Figma CSS don't
// apply to them: the gradient fills the hero and the horse is flush right.
//
// The first screen is the nav plus everything above the pathway row, with the row's
// top edge exactly on the bottom of the screen (100svh). The row itself is below the
// fold, at its fixed design height, so --rows is added on top of the screen height.
// With the 72px nav, the design is therefore a 1340×737 screen.
// - The hero's height comes from the screen's, not its width. It's a min-height, so
//   on a screen too short for the content the page scrolls instead of clipping.
// - The headline and gaps scale with the screen's height as well as its width, so
//   they shrink on short screens. The svh values are the design's sizes ÷ 737, so at
//   1340×737 this is the design exactly; 90px is the headline's cap.
// - The copy stays in the site column, with the frame's 152:84 split of whatever
//   free space remains. Below 1340px its inset follows the frame's 7.46%, which
//   keeps it clear of the gradient's pale corner.
// - The gradient stretches to the hero's shape; it's a blur, so that doesn't show.
//   Very short screens (a phone on its side) zoom it, so the headline isn't on its
//   pale edge.
//   The horse keeps its proportions, up to 68% of the width on tall narrow screens.
//   It's about 10% larger than in the export, as requested, which also moves the
//   head left of the design. It can't simply slide left: the mane is cropped along
//   the image's right edge, so it has to stay flush with the screen. It overflows
//   the hero's bottom by 7.2%, and the rest of the growth goes upward; the ears
//   stay inside the hero because they start 6% down the image.
// - The scrim is the design's "Rectangle 30" in hero units: clear at 45% of the
//   height, solid from 104%, so it's about 73% at the pathway row.
//
// Phones stack: copy at the top, location at the bottom of the screen, the horse
// sized to the space between them, and all three rows below the fold, over a
// gradient zoomed so no pale edge sits behind text.
export default function HomeHero() {
    return (
        <section
            aria-labelledby="home-title"
            className="relative isolate flex min-h-[calc(100svh-72px+var(--rows))] flex-col overflow-hidden bg-mx-night text-white [--rows:255px] md:[--rows:85px]"
        >
            <div aria-hidden className="absolute inset-0 -z-10">
                <Image src={hero.background.src} alt="" fill preload sizes="100vw" className="scale-[1.7] object-cover md:scale-100 md:object-fill md:[@media(max-height:500px)]:scale-[1.6]" />

                <div className="@container absolute right-0 bottom-[calc(var(--rows)-30px)] aspect-[1467/1500] w-[max(160px,min(100vw,calc((100svh-302px)*0.978)))] md:bottom-[-7.2%] md:w-[min(calc((100svh-72px+var(--rows))*1.079),68.4vw)]">
                    {/* Progressive blur: the head stays sharp and the body dissolves, as three
                        copies of the image, most blurred at the bottom of the stack. Each fades
                        out over a layer that's already opaque there; two layers fading across
                        each other would let the pale background show through as a band. Values
                        are in the horse's own units so they scale with it, and were tuned by
                        scoring against the Figma export. */}
                    <Image src={hero.object.src} alt="" fill sizes={HORSE_SIZES} className="object-contain mask-[linear-gradient(transparent_60%,#000_65%)] blur-[1.64cqw]" />
                    <Image src={hero.object.src} alt="" fill sizes={HORSE_SIZES} className="object-contain mask-[linear-gradient(transparent_45%,#000_50%,#000_65%,transparent_82%)] blur-[0.55cqw]" />
                    <Image src={hero.object.src} alt="" fill preload sizes={HORSE_SIZES} className="object-contain mask-[linear-gradient(#000_50%,transparent_65%)]" />
                    {/* The design's glints on the head and mane, at the strength that matches its export. */}
                    <span className="absolute top-[49.1%] left-[87.6%] h-[22.3%] w-[9%] origin-top-left rotate-[10.63deg] bg-[#E3FDFD] opacity-50 blur-[6.6cqw]" />
                    <span className="absolute top-[20.8%] left-[75.9%] h-[11.4%] w-[4.1%] origin-top-left -rotate-[37.61deg] bg-[#E3FDFD] opacity-50 blur-[6.6cqw]" />
                </div>

                <div className="absolute inset-x-0 bottom-0 h-[45%] bg-[linear-gradient(0deg,#00021C_53%,rgba(0,6,39,0)_100%)] md:top-[45.26%] md:bottom-auto md:h-[84%] md:bg-[linear-gradient(0deg,#00021C_29.53%,rgba(0,6,39,0)_100%)]" />
            </div>

            <div className="site-wrap flex flex-1 flex-col pt-[clamp(20px,4svh,40px)] md:px-[7.46vw] md:pt-0 xl:px-[100px]">
                <div className="hidden min-h-6 grow-[152] md:block" />

                <div className="flex flex-1 flex-col md:flex-none md:flex-row md:items-end md:justify-between md:portrait:flex-col md:portrait:items-start">
                    <div>
                        <h1
                            id="home-title"
                            className="flex flex-col gap-[0.12em] text-[clamp(2.25rem,min(11.3vw,7svh),3rem)] leading-[0.91] font-medium tracking-[-0.025em] md:text-[clamp(2.25rem,min(6.72vw,12.21svh),5.625rem)]"
                        >
                            {hero.title.map((line, index) => (
                                <span
                                    key={line}
                                    // The padding keeps the "g" from being clipped by the
                                    // gradient's tight line box; the margin cancels its height.
                                    className={index === hero.title.length - 1 ? "mb-[-0.1em] bg-[linear-gradient(90.42deg,#73C2FF_0.36%,#7C82FF_100%)] bg-clip-text pb-[0.1em] text-transparent" : "text-[#F7F7F7]"}
                                >
                                    {line}
                                </span>
                            ))}
                        </h1>
                        <p className="mt-[clamp(14px,2.8svh,24px)] text-base leading-[21px] tracking-[-0.015em] text-[#E2E8EB] md:mt-[clamp(20px,6.1svh,45px)]">
                            {hero.focus.map((line) => (
                                <span key={line} className="block">
                                    {line}
                                </span>
                            ))}
                        </p>
                        <a
                            href="#contact"
                            className="mt-[clamp(12px,1.9svh,16px)] flex h-14 w-full max-w-[261px] items-center justify-center gap-2.5 rounded-lg border border-[#2A30B8] bg-[linear-gradient(97.63deg,rgba(32,36,99,0.39)_0%,rgba(10,13,57,0.39)_100%)] px-6 font-medium whitespace-nowrap text-mx-lilac transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mx-lilac md:mt-[clamp(12px,2.58svh,19px)]"
                        >
                            {hero.cta}
                            <ArrowCircle className="bg-[#ABAFE8] text-mx-night" />
                        </a>
                    </div>

                    <div className="mt-auto pt-5 pb-4 md:mt-0 md:mb-[-4px] md:w-[129px] md:pt-0 md:pb-0 md:portrait:mt-8 md:portrait:mb-0">
                        <GlobeIcon className="size-6" strokeWidth={1.5} aria-hidden />
                        <p className="mt-2 text-[15.2px] leading-[20px] text-mx-slate [text-shadow:0_0_12px_rgba(0,2,28,0.95)]">
                            {hero.location.map((line) => (
                                <span key={line} className="block">
                                    {line}
                                </span>
                            ))}
                        </p>
                    </div>
                </div>

                <div className="hidden min-h-4 grow-[84] md:block" />
            </div>

            <nav aria-label="Practice areas" className="border-t border-mx-line">
                <ul className="grid md:grid-cols-[472fr_396fr_472fr] xl:grid-cols-[1fr_396px_1fr]">
                    {hero.pathways.map((pathway, index) => (
                        <li key={pathway.target} className={index > 0 ? "border-t border-mx-line md:border-t-0 md:border-l" : undefined}>
                            <a
                                href={`#${pathway.target}`}
                                className={
                                    "flex h-[84px] items-center gap-[22px] px-5 transition-colors hover:bg-white/5 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-mx-lilac md:px-6 " +
                                    (index === 0 ? "xl:pl-[calc(100%-372px)] " : "") +
                                    (index === hero.pathways.length - 1 ? "xl:pr-[calc(100%-372px)]" : "")
                                }
                            >
                                <span className="font-semibold text-mx-periwinkle">{pathway.number}</span>
                                <span className="flex-1 leading-[1.25] font-medium text-[#F7F7F7]">{pathway.label}</span>
                                <PlusIcon className="size-3.5 shrink-0 text-[#B7C5C9]" strokeWidth={1.5} aria-hidden />
                            </a>
                        </li>
                    ))}
                </ul>
            </nav>
        </section>
    )
}
