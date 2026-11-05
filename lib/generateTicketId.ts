import { randomInt } from "node:crypto"

// 30 symbols: no I, L, O, 0 or 1, so a reference read aloud or typed from an
// email can't be confused. 30^8 ≈ 6.5e11 combinations; callers still retry on
// a duplicate-key error.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ2345679"

export function generateTicketId(prefix: string, length = 8): string {
    let id = ""
    for (let i = 0; i < length; i += 1) id += ALPHABET[randomInt(ALPHABET.length)]
    return `${prefix}-${id}`
}

export const TICKET_ID_PATTERN = new RegExp(`^[A-Z]{2}-[${ALPHABET}]{8}$`)
