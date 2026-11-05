import test from "node:test"
import assert from "node:assert/strict"
import { changePasswordSchema, idListSchema, leadSubmitSchema, leadUpdateSchema, loginSchema, otpSchema } from "../lib/zodSchema.ts"

const valid = {
    name: "  Asha   Rao ",
    email: " Asha.Rao@Example.COM ",
    phone: "",
    inquiryType: "ai",
    organisation: "  Example   Bank ",
    message: "Need a brand identity for a café opening in March.",
}

test("valid submissions are normalised", () => {
    const result = leadSubmitSchema.safeParse(valid)
    assert.ok(result.success)
    assert.equal(result.data.name, "Asha Rao")
    assert.equal(result.data.email, "asha.rao@example.com")
    assert.equal(result.data.organisation, "Example Bank")
    assert.equal(result.data.phone, "")
    assert.equal(result.data.website, "")
})

test("names need a letter in any script; control and zero-width chars are stripped", () => {
    assert.ok(leadSubmitSchema.safeParse({ ...valid, name: "অনন্যা" }).success)
    assert.equal(leadSubmitSchema.safeParse({ ...valid, name: "!!!" }).success, false)
    assert.equal(leadSubmitSchema.safeParse({ ...valid, name: "1" }).success, false)
    const cleaned = leadSubmitSchema.safeParse({ ...valid, name: "As​ha\u0007 Rao" })
    assert.ok(cleaned.success)
    assert.equal(cleaned.data.name, "Asha Rao")
})

test("message length is checked after trimming; blank runs collapse", () => {
    assert.equal(leadSubmitSchema.safeParse({ ...valid, message: "   short    " }).success, false)
    assert.equal(leadSubmitSchema.safeParse({ ...valid, message: "x".repeat(2001) }).success, false)
    const result = leadSubmitSchema.safeParse({ ...valid, message: "Para one.\r\n\r\n\r\n\r\nPara two is here." })
    assert.ok(result.success)
    assert.equal(result.data.message, "Para one.\n\nPara two is here.")
})

test("bad email, phone or topic is rejected", () => {
    assert.equal(leadSubmitSchema.safeParse({ ...valid, email: "not-an-email" }).success, false)
    assert.equal(leadSubmitSchema.safeParse({ ...valid, phone: "call me" }).success, false)
    assert.equal(leadSubmitSchema.safeParse({ ...valid, phone: "+91 98765-43210" }).success, true)
    assert.equal(leadSubmitSchema.safeParse({ ...valid, inquiryType: "spam" }).success, false)
})

test("unknown source and junk timing are ignored, not fatal", () => {
    const result = leadSubmitSchema.safeParse({ ...valid, source: "evil", elapsedMs: "abc" })
    assert.ok(result.success)
    assert.equal(result.data.source, undefined)
    assert.equal(result.data.elapsedMs, undefined)
})

test("id lists are validated, de-duplicated and bounded", () => {
    const id = "a".repeat(24)
    const result = idListSchema.safeParse([id, id.toUpperCase()])
    assert.ok(result.success)
    assert.deepEqual(result.data, [id])
    assert.equal(idListSchema.safeParse([]).success, false)
    assert.equal(idListSchema.safeParse(["nope"]).success, false)
    assert.equal(idListSchema.safeParse(Array.from({ length: 101 }, (_, i) => i.toString(16).padStart(24, "0"))).success, false)
})

test("lead updates need something to change", () => {
    const _id = "b".repeat(24)
    assert.equal(leadUpdateSchema.safeParse({ _id }).success, false)
    assert.ok(leadUpdateSchema.safeParse({ _id, status: "won" }).success)
    assert.equal(leadUpdateSchema.safeParse({ _id, status: "archived" }).success, false)
    assert.ok(leadUpdateSchema.safeParse({ _id, adminNotes: "", updatedAt: "2026-10-30T10:00:00.000Z" }).success)
})

test("login and code formats", () => {
    assert.ok(loginSchema.safeParse({ email: "Owner@Example.com", password: "x" }).success)
    assert.equal(loginSchema.safeParse({ email: "owner@example.com", password: "" }).success, false)
    assert.ok(otpSchema.safeParse({ otp: "012345" }).success)
    for (const otp of ["12345", "1234567", "12a456", " 123456"]) assert.equal(otpSchema.safeParse({ otp }).success, false, otp)
})

test("password change enforces policy, confirmation and a new value", () => {
    const base = { currentPassword: "Old-password-1", password: "New-password-2", confirmPassword: "New-password-2" }
    assert.ok(changePasswordSchema.safeParse(base).success)
    assert.equal(changePasswordSchema.safeParse({ ...base, confirmPassword: "nope" }).success, false)
    assert.equal(changePasswordSchema.safeParse({ ...base, password: "short", confirmPassword: "short" }).success, false)
    assert.equal(changePasswordSchema.safeParse({ ...base, password: base.currentPassword, confirmPassword: base.currentPassword }).success, false)
})

test("topic and organisation are optional on the public form", () => {
    const result = leadSubmitSchema.safeParse({ ...valid, inquiryType: undefined, organisation: undefined })
    assert.ok(result.success)
    assert.equal(result.data.inquiryType, "general")
    assert.equal(result.data.organisation, "")
})
