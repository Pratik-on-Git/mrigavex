// CSV building for admin exports.
//
// Every cell is quoted and inner quotes doubled, so commas, quotes and line
// breaks inside a message never break the row. Cells starting with = + - @
// (or tab / carriage return) are prefixed with an apostrophe: spreadsheet apps
// execute those as formulas, and lead fields are typed by strangers
// ("CSV injection").
//
// Pure module: unit tests import it directly.

const FORMULA_START = /^[=+\-@\t\r]/

export function csvCell(value: unknown): string {
    if (value === null || value === undefined) return '""'
    let text = value instanceof Date ? value.toISOString() : String(value)
    if (FORMULA_START.test(text)) text = `'${text}`
    return `"${text.replace(/"/g, '""')}"`
}

export function toCsv(headers: string[], rows: unknown[][]): string {
    const lines = [headers, ...rows].map((row) => row.map(csvCell).join(","))
    // BOM so Excel opens UTF-8 (names in Bengali, Hindi, emoji…) correctly.
    return `﻿${lines.join("\r\n")}\r\n`
}
