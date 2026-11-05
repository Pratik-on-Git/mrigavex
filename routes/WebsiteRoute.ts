import type { LeadSource } from "@/lib/leadConfig"

// Public route constants — never hardcode storefront paths in components.
export const WEBSITE_HOME = "/"
// The site is one page; sections are reached by anchor. Rooted at "/" so the
// links also work from the 404 page.
export const WEBSITE_CONTACT = "/#contact"
// Query added when a practice area link sends the visitor to the form.
export const contactTopicQuery = (source: LeadSource) => `?for=${source}`

export const AUTH_LOGIN = "/auth/login"
