import test from "node:test"
import assert from "node:assert/strict"
import { ADMIN_HOME, safeAdminCallback } from "../lib/safeRedirect.ts"

test("admin paths (with query and hash) are kept", () => {
    assert.equal(safeAdminCallback("/admin/leads"), "/admin/leads")
    assert.equal(safeAdminCallback("/admin/leads?status=new&q=a%26b#top"), "/admin/leads?status=new&q=a%26b#top")
    assert.equal(safeAdminCallback("/admin"), "/admin")
})

test("missing or non-string input falls back to the dashboard", () => {
    for (const value of [undefined, null, "", 42, {}, "x".repeat(600)]) {
        assert.equal(safeAdminCallback(value), ADMIN_HOME)
    }
})

test("external and protocol-relative targets are rejected", () => {
    for (const value of [
        "https://evil.com",
        "//evil.com",
        "/\\evil.com",
        "\\\\evil.com",
        "/%2F%2Fevil.com",
        "/%5Cevil.com",
        "/%252F%252Fevil.com",
        "javascript:alert(1)",
        " //evil.com",
        "/admin/../\\evil.com",
        "/%0d%0aSet-Cookie:x=1",
    ]) {
        assert.equal(safeAdminCallback(value), ADMIN_HOME, value)
    }
})

test("only /admin paths are allowed, including after normalisation", () => {
    assert.equal(safeAdminCallback("/work"), ADMIN_HOME)
    assert.equal(safeAdminCallback("/administrator"), ADMIN_HOME)
    assert.equal(safeAdminCallback("/admin/../work"), ADMIN_HOME)
    assert.equal(safeAdminCallback("/api/lead/export"), ADMIN_HOME)
})

test("malformed percent-encoding falls back", () => {
    assert.equal(safeAdminCallback("/admin/%E0%A4%A"), ADMIN_HOME)
})
