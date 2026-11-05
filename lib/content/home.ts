// Home page content (Figma "MRIGAVEX_2_WEBSITE"). Everything the page shows
// comes from here, so copy and images change without touching layout.
// tests/content-assets.test.ts fails if an image path stops matching a file.
//
// The copy was transcribed from a screenshot of the design: check it against
// the Figma before launch.
//
// TODO(content): still missing from the design's assets —
//   • vision.steps images: 01.png, Modular lilac pinwheel, Converging ribbons,
//     Endless Loop. The steps reuse the expertise graphics, tinted, until then.
//   • leadership.moreHref (the "Know more" button stays hidden until it's set)
// The Vision background is also a stand-in: see Vision.tsx. All artwork is
// decorative, so it carries no alt text.

import type { LeadSource } from "../leadConfig.ts"

const GRAPHIC = {
    starburst: "/img/base/Group 1410188788.png",
    loops: "/img/base/Group 1410188789.png",
    target: "/img/base/Group 1410188791.png",
}

export const HOME_CONTENT = {
    hero: {
        background: { src: "/img/hero/bg.png" },
        object: { src: "/img/hero/Object.png", width: 1467, height: 1500 },
        // One entry per line; the last is the gradient accent.
        title: ["Great Vision", "requires", "Great Strategies."],
        focus: ["AI Strategy. Financial Transformation.", "Responsible Venture Growth."],
        cta: "Let’s Shape What’s Next",
        location: ["Netherland Based.", "Globally Engaged."],
        pathways: [
            { number: "01", label: "AI & Technology", target: "ai-strategy" },
            { number: "02", label: "Financial Services", target: "financial-services" },
            { number: "03", label: "Venture & Growth", target: "venture-growth" },
        ],
    },

    perspective: {
        eyebrow: "A clearer perspective",
        title: ["AI is moving fast.", "Make the right moves."],
        intro: "Complex change calls for more than a strategy deck. It calls for an advisor who has led transformation from the inside.",
        body: "MRIGAVEX works with boards, CEOs, CIOs and transformation leaders at the intersection of strategy, technology and execution. We bring decades of delivery experience and the independence to ask the difficult questions.",
        // `suffix` is the smaller "+" after a figure.
        proof: [
            { value: "29", suffix: "+", label: "Years leading enterprise technology transformation" },
            { value: "20", suffix: "+", label: "Countries of professional engagement" },
            { value: "EVP", label: "Executive leadership in global technology organisations" },
            { value: "PhD", label: "Doctoral qualification in leadership and technology" },
        ],
    },

    expertise: {
        eyebrow: "Our expertise",
        title: ["Complex Challenges.", "Clear Direction."],
        support: "Independent thinking, deep sector knowledge and a practical path from strategy to execution.",
        // The images are traced from the PNGs in GRAPHIC by scripts/trace-graphics.mts.
        cards: [
            {
                id: "ai-strategy",
                topic: "ai",
                image: { src: "/img/base/starburst.svg" },
                particles: "burst",
                title: "AI Strategy & Technology Transformation",
                body: "Turn emerging technology into practical competitive advantage, from AI strategy and governance to adoption at enterprise scale.",
                cta: "Explore AI Advisory",
            },
            {
                id: "financial-services",
                topic: "financial",
                image: { src: "/img/base/loops.svg" },
                particles: "loops",
                title: "Financial Services Transformation",
                body: "Navigate Fintech disruption, modernise core platforms and build the operating models that move financial institutions forward.",
                cta: "Explore Financial Services",
            },
            {
                id: "venture-growth",
                topic: "venture",
                image: { src: "/img/base/target.svg" },
                particles: "target",
                title: "Responsible Venture & Business Growth",
                body: "Build meaningful partnerships, assess investment opportunities and enter new markets with informed, sustainable ambition.",
                cta: "Explore Venture Advisory",
            },
        ] as { id: string; topic: LeadSource; image: { src: string }; particles: "burst" | "loops" | "target"; title: string; body: string; cta: string }[],
    },

    practice: {
        eyebrow: "Explore the practice",
        titleStart: "Expertise that connects",
        titleEnd: "the whole picture.",
        pill: "Connect with us",
        body: "From an independent board perspective to the detail of delivery.",
        links: [
            { label: "AI, Technology & Leadership", topic: "ai" },
            { label: "Financial Services & Digital Change", topic: "financial" },
            { label: "Venture, Partnerships & International Growth", topic: "venture" },
            { label: "Executive, Board & Thought Leadership", topic: "contact" },
        ] as { label: string; topic: LeadSource }[],
    },

    vision: {
        eyebrow: "From vision to value",
        cta: "Let’s Think Together",
        intro: ["Senior attention at every stage.", "Accountability beyond the recommendation."],
        title: ["Think Clearly.", "Move Deliberately."],
        // `tint` recolours the stand-in graphics; drop it with the final art,
        // which has its colour baked in like the expertise graphics.
        steps: [
            {
                title: "Diagnose",
                body: "Begin with an honest, unfiltered diagnosis of where the challenge truly lies.",
                image: { src: GRAPHIC.target },
            },
            {
                title: "Design",
                body: "Co-create an ambitious transformation architecture grounded in actual capability.",
                image: { src: GRAPHIC.starburst },
                tint: "#C0852D",
            },
            {
                title: "Deliver",
                body: "Stay engaged through implementation, including its most demanding moments.",
                image: { src: GRAPHIC.starburst },
                tint: "#2B8F8A",
            },
            {
                title: "Sustain",
                body: "Develop the independence to sustain and evolve what has been built.",
                image: { src: GRAPHIC.loops },
                tint: "#A05DDB",
            },
        ] as { title: string; body: string; image: { src: string }; tint?: string }[],
    },

    leadership: {
        eyebrow: "Leadership",
        title: ["Tech moves fast.", "Experience moves further."],
        name: "Dr. Sudip Lahiri",
        role: "PhD • Founder & Principal Advisor",
        // 2× the 470×570 tile; the rounded corners are part of the image.
        portrait: { src: "/img/profile/Frame 1410189260 (1).png", alt: "Portrait of Dr. Sudip Lahiri", width: 940, height: 1140 },
        moreLabel: "Know more about Dr. Sudip Lahiri",
        moreHref: null as string | null,
        bio: [
            "Dr. Sudip Kumar Lahiri is the founder of Velantis Tech, bringing nearly three decades of senior enterprise leadership experience in technology transformation across Europe, the United Kingdom, Asia, and beyond. He has led some of the most consequential technology transformation programmes at tier-1 financial institutions — combining deep strategic thinking with the hands-on delivery experience that is rare at the senior advisory level.",
            "His expertise spans AI and digital transformation, Fintech strategy, core banking platform modernisation, capital markets technology, payments innovation, and the full lifecycle of large-scale enterprise technology programmes. He is a recognised thought leader on the intersection of emerging technology and regulated financial services, with active roles in industry bodies and international business forums.",
        ],
    },

    contact: {
        eyebrow: "Start a conversation",
        title: ["Big Decisions.", "Let’s Talk."],
        body: "Facing complex technology-led change? Looking for an independent senior perspective? Let’s explore where MRIGAVEX can make a difference.",
        formTitle: "Begin a conversation",
    },

    footer: {
        tagline: ["Perception for complexity.", "Vision for what’s next."],
        copyright: "© 2026 MRIGAVEX. All rights reserved.",
        location: "Den Haag, Netherlands",
        strapline: "Technology. Transformation. Advisory.",
    },
}
