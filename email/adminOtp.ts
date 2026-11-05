import { emailShell, fineprint, formatDateTime, heading, paragraph, valueCard, esc } from "./_shared"

/**
 * Second sign-in step for the admin portal. Says when and roughly from where
 * the attempt came so the owner can recognise one that wasn't theirs.
 */
export function adminOtpEmail({ code, minutes, at, userAgent }: { code: string; minutes: number; at: Date; userAgent: string }) {
    const bodyHtml = `
${heading("Your sign-in code")}
${paragraph("Use this code to finish signing in to your admin portal.")}
${valueCard("Sign-in code", code)}
${paragraph(`It expires in ${minutes} minutes and can only be used once.`)}
${fineprint(`Requested ${esc(formatDateTime(at))}${userAgent ? ` from ${esc(userAgent.slice(0, 120))}` : ""}.<br>
If this wasn't you, your password may be known to someone else: change it from Admin → Settings and choose “Sign out everywhere”. Never share this code.`)}`

    return emailShell({ preheader: `Your sign-in code is ${code}`, bodyHtml })
}
