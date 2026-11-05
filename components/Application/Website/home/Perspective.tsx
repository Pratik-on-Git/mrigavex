import { HOME_CONTENT } from "@/lib/content/home"
import { LOGO_PATH } from "../Logo"

const { perspective } = HOME_CONTENT

// "AI is moving fast." Behind it, the logo blown up about 35× and blurred, as in
// the design. Sizes are the Figma's at 1340px, in vw so the crop holds at any
// width. The design's gradient is nearly flat across the part that's visible
// here, so a fade from its 39% to 26% strength is the same thing, and simpler.
export default function Perspective() {
    return (
        <section id="about" aria-labelledby="perspective-title" className="relative isolate overflow-hidden border-t border-mx-line bg-mx-deep">
            <svg aria-hidden viewBox="0 0 64 25" className="absolute top-[-13.2vw] left-[23.4%] -z-10 w-[169vw] max-w-none blur-[6px]">
                <defs>
                    <linearGradient id="perspective-logo-fade" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#1a364c" stopOpacity="0.39" />
                        <stop offset="100%" stopColor="#1a364c" stopOpacity="0.26" />
                    </linearGradient>
                </defs>
                <path d={LOGO_PATH} fill="url(#perspective-logo-fade)" />
            </svg>
            <div className="site-wrap py-16 md:py-[100px]">
                <div className="grid gap-10 lg:grid-cols-[1fr_458px] lg:gap-[75px]">
                    <div className="flex flex-col justify-between gap-10">
                        <p className="text-xs font-medium text-mx-lilac/75 uppercase">{perspective.eyebrow}</p>
                        <h2 id="perspective-title" className="flex flex-col gap-[15.84px] text-[clamp(2.25rem,4.73vw,3.96rem)] leading-[1] tracking-[-0.025em] md:leading-[0.91]">
                            {perspective.title.map((line, index) => (
                                <span key={line} className={index === 0 ? "text-mx-periwinkle" : "text-white"}>
                                    {line}
                                </span>
                            ))}
                        </h2>
                    </div>
                    <div>
                        <p className="text-[19.2px] leading-[25px] text-[#DCE1E7]">{perspective.intro}</p>
                        <p className="mt-8 leading-[21px] text-mx-slate">{perspective.body}</p>
                    </div>
                </div>

                <dl className="mt-14 grid gap-8 border-t border-mx-hairline pt-6 sm:grid-cols-2 md:mt-[72px] lg:grid-cols-4 lg:gap-[30px]">
                    {perspective.proof.map((point) => (
                        <div key={point.value} className="flex items-center gap-[18px]">
                            <dt className="flex shrink-0 items-center gap-1 text-[43.2px] leading-[43px] text-mx-periwinkle">
                                {point.value}
                                {point.suffix && <span className="text-[25.6px]">{point.suffix}</span>}
                            </dt>
                            <dd className="text-xs leading-4 text-mx-slate">{point.label}</dd>
                        </div>
                    ))}
                </dl>
            </div>
        </section>
    )
}
