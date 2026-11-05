import test from "node:test"
import assert from "node:assert/strict"
import { TICKET_ID_PATTERN, generateTicketId } from "../lib/generateTicketId.ts"
import { passwordProblems } from "../lib/passwordPolicy.ts"
import { telLink, whatsappLink } from "../lib/format.ts"

test("ticket ids use the unambiguous alphabet", () => {
    const seen = new Set<string>()
    for (let i = 0; i < 500; i += 1) {
        const id = generateTicketId("MX")
        assert.match(id, TICKET_ID_PATTERN)
        assert.doesNotMatch(id.slice(3), /[ILO01]/)
        seen.add(id)
    }
    assert.ok(seen.size > 495, "ids should practically never repeat")
})

test("password policy lists every missing requirement", () => {
    assert.deepEqual(passwordProblems("Str0ng-enough"), [])
    const problems = passwordProblems("weak")
    assert.ok(problems.includes("an uppercase letter"))
    assert.ok(problems.includes("a number"))
    assert.ok(problems.includes("a symbol"))
    assert.ok(passwordProblems(" Leading-space1").includes("no leading or trailing spaces"))
})

test("WhatsApp links add India's code to bare 10-digit mobiles only", () => {
    assert.equal(whatsappLink("98765 43210"), "https://wa.me/919876543210")
    assert.equal(whatsappLink("098765 43210"), "https://wa.me/919876543210")
    assert.equal(whatsappLink("+44 7700 900123"), "https://wa.me/447700900123")
    assert.equal(whatsappLink("123"), null)
    assert.equal(telLink("+91 (98765) 43210"), "tel:+919876543210")
})
