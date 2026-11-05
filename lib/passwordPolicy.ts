// Admin password policy. Shared by the change-password API/UI and the
// `npm run admin` CLI so the rules can never drift apart.
//
// Pure module: imported by Node directly (scripts, tests).

export const PASSWORD_MIN = 10
export const PASSWORD_MAX = 128
// bcrypt only uses the first 72 bytes; longer passwords are still accepted
// but the cost stays sensible.
export const BCRYPT_ROUNDS = 12

export function passwordProblems(password: string): string[] {
    const problems: string[] = []
    if (password.length < PASSWORD_MIN) problems.push(`at least ${PASSWORD_MIN} characters`)
    if (password.length > PASSWORD_MAX) problems.push(`at most ${PASSWORD_MAX} characters`)
    if (!/[a-z]/.test(password)) problems.push("a lowercase letter")
    if (!/[A-Z]/.test(password)) problems.push("an uppercase letter")
    if (!/[0-9]/.test(password)) problems.push("a number")
    if (!/[^A-Za-z0-9]/.test(password)) problems.push("a symbol")
    if (/^\s|\s$/.test(password)) problems.push("no leading or trailing spaces")
    return problems
}

export function passwordPolicyMessage(password: string): string | null {
    const problems = passwordProblems(password)
    return problems.length ? `Password needs ${problems.join(", ")}.` : null
}
