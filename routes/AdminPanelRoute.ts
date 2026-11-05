// Admin route constants (EnergyFlow pattern: ADMIN_<ENTITY>_<VIEW>).
export const ADMIN_DASHBOARD = "/admin/dashboard"

// Leads (contact-form submissions)
export const ADMIN_LEADS_SHOW = "/admin/leads"
export const ADMIN_LEAD_DETAILS = (id: string) => (id ? `/admin/leads/details/${id}` : "")

// Trash (?trashof=<entity>)
export const ADMIN_TRASH = "/admin/trash"
export const ADMIN_TRASH_OF = (entity: "leads") => `${ADMIN_TRASH}?trashof=${entity}`

// Account security
export const ADMIN_SETTINGS = "/admin/settings"
