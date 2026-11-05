import { Suspense } from "react"
import { HOME_CONTENT } from "@/lib/content/home"
import { SITE } from "@/lib/site"
import ContactForm from "@/components/Application/Website/contact/ContactForm"

const { contact } = HOME_CONTENT

// "Big Decisions. Let's Talk." The section is static; the form reads ?for= on
// the client, so it sits behind Suspense (required for useSearchParams under
// Cache Components). The fallback reserves the form's height to avoid a jump.
export default function ContactSection() {
    return (
        <section id="contact" aria-labelledby="contact-title" className="bg-[linear-gradient(180deg,#030823_0%,#00021C_100%)] text-white">
            <div className="site-wrap grid gap-12 py-16 md:py-[100px] lg:grid-cols-[1fr_1fr] lg:gap-[75px]">
                <div>
                    <p className="text-xs font-medium text-mx-lilac/75 uppercase">{contact.eyebrow}</p>
                    <h2 id="contact-title" className="mt-10 flex flex-col gap-[15.84px] text-[clamp(2.25rem,4.73vw,3.96rem)] leading-[1] tracking-[-0.025em] md:mt-[50px] md:leading-[0.91]">
                        <span className="text-mx-periwinkle">{contact.title[0]}</span>
                        <span>{contact.title[1]}</span>
                    </h2>
                    <p className="mt-9 max-w-[458px] text-[19.2px] leading-[25px] text-[#DCE1E7]">{contact.body}</p>
                    <a href={`mailto:${SITE.email}`} className="mt-6 inline-block break-all text-mx-sky underline underline-offset-4 transition-colors hover:text-white">
                        {SITE.email}
                    </a>
                </div>

                <div>
                    <h3 className="text-xl font-medium">{contact.formTitle}</h3>
                    <Suspense fallback={<div className="min-h-[29rem]" />}>
                        <ContactForm />
                    </Suspense>
                </div>
            </div>
        </section>
    )
}
