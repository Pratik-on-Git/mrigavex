import test from "node:test"
import assert from "node:assert/strict"
import { csvCell, toCsv } from "../lib/csv.ts"

test("cells are quoted and inner quotes doubled", () => {
    assert.equal(csvCell('He said "hi", then left'), '"He said ""hi"", then left"')
    assert.equal(csvCell("line one\nline two"), '"line one\nline two"')
    assert.equal(csvCell(null), '""')
    assert.equal(csvCell(undefined), '""')
    assert.equal(csvCell(12), '"12"')
})

test("formula-looking cells are neutralised (CSV injection)", () => {
    for (const value of ["=HYPERLINK(\"http://x\")", "+1+2", "-2+3", "@SUM(A1)", "\t=1", "\r=1"]) {
        assert.ok(csvCell(value).startsWith(`"'`), value)
    }
    // A phone number starting with + is still exported, just prefixed.
    assert.equal(csvCell("+91 98765 43210"), `"'+91 98765 43210"`)
})

test("dates export as ISO strings", () => {
    assert.equal(csvCell(new Date("2026-10-30T10:00:00.000Z")), '"2026-10-30T10:00:00.000Z"')
})

test("documents start with a BOM and use CRLF rows", () => {
    const csv = toCsv(["Name", "Email"], [["Asha", "asha@example.com"]])
    assert.ok(csv.startsWith("﻿"))
    assert.equal(csv, '﻿"Name","Email"\r\n"Asha","asha@example.com"\r\n')
})
