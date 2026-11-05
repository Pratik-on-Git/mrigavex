import { SITE, absoluteUrl } from "@/lib/site"

/* Shared email layout (EnergyFlow email/_shared.js pattern, trimmed down).
   Email clients strip <style> and CSS variables, so every value is an inline
   literal and every layout primitive is a table. Every interpolated value a
   visitor typed MUST go through esc(). */

export const MAIL = {
    ink: "#0A0A0A",
    body: "#3F3F46",
    muted: "#71717A",
    border: "#E4E4E7",
    panel: "#F4F4F5",
    white: "#FFFFFF",
    danger: "#B91C1C",
    font: "'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    mono: "'Geist Mono', SFMono-Regular, Menlo, Consolas, monospace",
}

export const esc = (value: unknown) =>
    String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;")

// Only http(s)/mailto/tel links survive; anything else becomes "#".
export const escUrl = (value: string) => (/^(https?:|mailto:|tel:)/i.test(value) ? esc(value) : "#")

export const nl2br = (value: string) => esc(value).replace(/\r?\n/g, "<br>")

export const heading = (text: string) =>
    `<h1 style="margin:0 0 12px;font-family:${MAIL.font};font-size:22px;line-height:1.3;font-weight:600;color:${MAIL.ink};">${text}</h1>`

export const paragraph = (html: string) =>
    `<p style="margin:0 0 16px;font-family:${MAIL.font};font-size:15px;line-height:1.6;color:${MAIL.body};">${html}</p>`

export const fineprint = (html: string) =>
    `<p style="margin:16px 0 0;font-family:${MAIL.font};font-size:12px;line-height:1.5;color:${MAIL.muted};">${html}</p>`

export const valueCard = (caption: string, value: string) => `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 20px;">
  <tr><td align="center" style="background:${MAIL.panel};border:1px solid ${MAIL.border};border-radius:12px;padding:20px;">
    <div style="font-family:${MAIL.font};font-size:12px;letter-spacing:1px;text-transform:uppercase;color:${MAIL.muted};margin-bottom:8px;">${esc(caption)}</div>
    <div style="font-family:${MAIL.mono};font-size:30px;letter-spacing:8px;font-weight:600;color:${MAIL.ink};">${esc(value)}</div>
  </td></tr>
</table>`

// [label, html] rows. Values are expected to be escaped already.
export const detailRows = (rows: [string, string][]) => `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 16px;">
${rows
    .map(
        ([label, value]) => `  <tr>
    <td valign="top" style="padding:8px 12px 8px 0;width:120px;font-family:${MAIL.font};font-size:13px;color:${MAIL.muted};border-bottom:1px solid ${MAIL.border};">${esc(label)}</td>
    <td valign="top" style="padding:8px 0;font-family:${MAIL.font};font-size:14px;line-height:1.55;color:${MAIL.ink};border-bottom:1px solid ${MAIL.border};word-break:break-word;">${value || "&mdash;"}</td>
  </tr>`
    )
    .join("\n")}
</table>`

export const button = (label: string, href: string) => `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 4px;">
  <tr><td style="border-radius:8px;background:${MAIL.ink};">
    <a href="${escUrl(href)}" style="display:inline-block;padding:12px 20px;font-family:${MAIL.font};font-size:14px;font-weight:600;color:${MAIL.white};text-decoration:none;border-radius:8px;">${esc(label)}</a>
  </td></tr>
</table>`

export const link = (label: string, href: string) =>
    `<a href="${escUrl(href)}" style="color:${MAIL.ink};text-decoration:underline;">${esc(label)}</a>`

export function emailShell({ preheader, bodyHtml }: { preheader: string; bodyHtml: string }) {
    return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${esc(SITE.name)}</title></head>
<body style="margin:0;padding:0;background:${MAIL.panel};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${MAIL.panel};">
  <tr><td align="center" style="padding:32px 16px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:${MAIL.white};border:1px solid ${MAIL.border};border-radius:16px;">
      <tr><td style="padding:24px 28px 0;font-family:${MAIL.font};font-size:14px;font-weight:600;letter-spacing:0.5px;color:${MAIL.ink};">${esc(SITE.name)}</td></tr>
      <tr><td style="padding:20px 28px 28px;">${bodyHtml}</td></tr>
    </table>
    <div style="max-width:560px;padding:16px 8px 0;font-family:${MAIL.font};font-size:12px;color:${MAIL.muted};">
      Sent by ${link(SITE.url.replace(/^https?:\/\//, ""), absoluteUrl("/"))}
    </div>
  </td></tr>
</table>
</body>
</html>`
}

export const formatDateTime = (date: Date) =>
    new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Amsterdam" }).format(date) + " Netherlands time"
