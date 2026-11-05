import { emailShell, fineprint, formatDateTime, heading, paragraph, esc } from "./_shared"

/** Security notice after the admin password changes. */
export function passwordChangedEmail({ at }: { at: Date }) {
    const bodyHtml = `
${heading("Your admin password was changed")}
${paragraph(`The password for your admin portal was changed on ${esc(formatDateTime(at))}. Every other signed-in device has been signed out.`)}
${fineprint("If you didn't do this, reset the password from the server with <code>npm run admin -- reset-password</code> and check who has access to your email.")}`

    return emailShell({ preheader: "Your admin password was changed.", bodyHtml })
}
