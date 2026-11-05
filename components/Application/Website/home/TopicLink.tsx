"use client"

import type { ReactNode } from "react"
import type { LeadSource } from "@/lib/leadConfig"
import { contactTopicQuery } from "@/routes/WebsiteRoute"

// Goes to the contact form and tells it which practice area the visitor came
// from. The topic is added with replaceState, which Next's useSearchParams
// follows, and the anchor stays a plain same-page "#contact" link so Lenis
// glides there; a query in the href itself would reload the page. The hash is
// repeated in replaceState so a refresh still lands on the form.
export default function TopicLink({ topic, className, children }: { topic: LeadSource; className?: string; children: ReactNode }) {
    return (
        <a href="#contact" className={className} onClick={() => window.history.replaceState(null, "", `${contactTopicQuery(topic)}#contact`)}>
            {children}
        </a>
    )
}
