@AGENTS.md

# MRIGAVEX — project guide

Website for **MRIGAVEX**, an independent advisory firm (AI strategy, financial
transformation, responsible venture growth; founder Dr. Sudip Lahiri; based in
the Netherlands), with a private admin portal that only the owner can sign in
to. It began as a copy of `../debarpan-portfolio` and keeps its admin, auth and
lead pipeline. Built by the same team as EnergyFlow (`../EnergyFlow`) and
deliberately follows its file structure, naming and API conventions — check
EnergyFlow's `MASTER_DOCUMENTATION.md` when unsure how something "should" look,
then adapt it to TypeScript + Next 16.

## Scope (current)

- Public: **one page at /** (sections reached by anchor) plus a 404. There are no other public routes.
- Admin portal: **/admin/dashboard**, **/admin/leads**, **/admin/leads/details/[id]**, **/admin/trash?trashof=leads**, **/admin/settings**.
- Only feature with data: **contact-form leads**. All page copy and image paths live in `lib/content/home.ts`; site identity in `lib/site.ts`.
- **Built from the Figma frame "MRIGAVEX_2_WEBSITE"** (see Design system). Stand-ins waiting on the client are listed under Open items.

## Stack — and what's different from EnergyFlow

- **Next 16.4** (App Router, Turbopack). Read `node_modules/next/dist/docs/` before using an API. Key differences from EnergyFlow (Next 15):
  - `middleware.js` → **`proxy.ts`** (export `proxy`, Node runtime).
  - **Cache Components + Partial Prefetching are ON.** Any `cookies()`, `headers()`, `searchParams`, `params`, `usePathname()`/`useSearchParams()`, `Date.now()` or DB read must sit behind `<Suspense>` or a `"use cache"` scope, or the build fails ("blocking route"). Pattern used: static server `page.tsx` → client component inside `<Suspense>`.
  - `revalidateTag(tag, profile)` needs 2 args; `updateTag` for read-your-writes.
  - Admin GET route handlers call `connection()` (inside `requireAdmin`) so they're never prerendered; `catchError` calls `unstable_rethrow` so Next's control-flow errors aren't swallowed.
- **TypeScript strict** (EnergyFlow is JS). React 19.3, Tailwind v4, shadcn **base-vega** style = **Base UI** primitives (no `asChild`; use `render` prop, or `buttonVariants()` on a `<Link>`). `cn` comes from the `cn` package.
- **Geist** (sans) + **Geist Mono** everywhere, via `next/font/google` in `app/layout.tsx` → `--font-geist-*` → mapped to `font-sans`/`font-mono` in `app/globals.css`. Don't add other fonts (the design's one DM Sans glyph, the pathway "+", is a lucide icon).
- MongoDB + **Mongoose 9** (pre hooks have no `next`; use `returnDocument: "after"`, not `new: true`; filter type is `QueryFilter`). **Zod 4** (`z.email()`, `{ error: "…" }`, `z.iso.datetime()`), `@hookform/resolvers` 6, react-hook-form, TanStack Query (admin only), sonner, Nodemailer 10, jose, bcryptjs.
- `package.json` has `"type": "module"`. Node ≥ 22.18 (scripts/tests use Node's built-in TS type stripping).

## Structure (EnergyFlow layout)

```text
app/
  layout.tsx, globals.css, not-found.tsx, error.tsx, robots.ts, sitemap.ts
  (root)/(website)/page.tsx + layout.tsx (Header/Footer)   ← the whole public site
  (root)/(admin)/admin/{dashboard,leads,leads/details/[id],trash,settings,[...missing]}/page.tsx + layout.tsx + not-found.tsx
  (root)/auth/login/page.tsx + layout.tsx           ← no register / forgot-password, by design
  api/auth/{login,verify-otp,resend-otp,logout,logout-all,me,change-password}/route.ts
  api/lead/route.ts (GET admin list · POST public form), get/[id], update, mark-read, delete, export, stats
components/ui/                      shadcn primitives (+ native-select.tsx)
components/Application/Website/     Header(+HeaderNav), Footer, Logo, NotFoundContent, contact/ContactForm, home/ (HomeHero, Perspective, Expertise, Vision, Leadership, ContactSection, TopicLink, ArrowCircle, particles/)
components/Application/Admin/       AdminShell, AdminProviders, PageHeader, AdminEmptyState, ConfirmDialog, TrashView, leads/*, dashboard/*, settings/*
components/Application/Auth/        LoginFlow
email/                              _shared.ts + one template per file (adminOtp, leadNotification, passwordChanged)
hooks/                              useDebounce, useUnsavedChanges
lib/                                helpers/config; lib/services/* = server-only data access; lib/content/* = page copy
models/                             Admin.model.ts, AdminOtp.model.ts, Lead.model.ts
routes/                             WebsiteRoute.ts, AdminPanelRoute.ts (path constants — never hardcode paths)
scripts/admin.mts                   owner account CLI
scripts/trace-graphics.mts          traces the expertise PNGs into the SVGs ParticleGraphic animates
tests/*.test.ts                     node:test on pure lib modules
proxy.ts
```

## Design system (Figma "MRIGAVEX_2_WEBSITE", 1340px wide)

- Frame 1340px, gutters 100px. Sections are full-bleed; content sits in the `site-wrap` utility (`app/globals.css`): max 1340px, gutters 20px → 40px (md) → 100px (xl). Section padding 100px on desktop.
- Colours are Tailwind tokens in `app/globals.css`, prefixed `mx-`: `mx-ink` nav/footer, `mx-night`/`mx-deep` dark sections, `mx-mist` light sections, `mx-navy` cards and text on light, `mx-line`/`mx-rule`/`mx-hairline` rules, `mx-logo`, `mx-lilac`, `mx-periwinkle`, `mx-indigo`, `mx-cobalt`, `mx-sky`, `mx-slate`, `mx-soft`. Use these, not raw hex, for new sections.
- Type (Geist): hero/Vision 90px, line-height 0.91, tracking −0.025em, weight 500 (`text-[clamp(3rem,6.72vw,5.625rem)]`); section headlines 63px (`text-[clamp(2.25rem,4.73vw,3.96rem)]`); intros 19.2/25; body 16/21; eyebrows 12px weight 500 uppercase; buttons 16px weight 500, height 56, radius 8. Cards radius 16.
- Page order: `HomeHero` → `Perspective` (#about) → `Expertise` (#expertise, cards #ai-strategy #financial-services #venture-growth, then #practice) → `Vision` → `Leadership` (#leadership) → `ContactSection` (#contact). #top wraps the layout for "Back to top".
- Hero: `hero/bg.png` and `hero/Object.png` are 2× exports of the 1340×750 frame, measured by pixel-matching against the Figma export, so the 1910px / 25.52° layer values in the Figma CSS **do not apply to them**. The gradient fills the hero (`object-fill`), and the horse is flush right at about 110% of the hero's height, overflowing the bottom by 7.2%: the client asked for it larger and its head a little left of the export. Don't slide it left instead, because the mane is cropped along the image's right edge and the cut would show. **The first screen is the nav plus everything above the pathway row: the row's top edge sits exactly on the bottom of the screen (100svh), and the row is below the fold.** The design is therefore a 1340×737 screen. Hero height comes from the screen's height, as a min-height so short screens scroll rather than clip; the headline and gaps scale with `min(vw, svh)`, using the design's sizes ÷ 737. The copy stays in the site column with the frame's 152:84 split of the free space. The scrim is "Rectangle 30" in hero units (45.26% to 129%). The horse's body blur is three masked copies, in `cqw` so it scales. Phones zoom the gradient so no pale edge sits behind text. At 1340×737 the hero is 750px tall, as in the design.
- To compare with an export, screenshot the section at the frame's size and score it per zone, in separate browser instances: a background tab isn't painted properly. If `.next-check` is deleted while `next start` runs, the page loads unstyled because the stylesheet returns 500, so check CSS is served before trusting a score.
- Header (72px, sticky, blurred): logo · five anchor links with scroll-spy (`useActiveSection` in `HeaderNav`, IntersectionObserver band at mid-screen; About while on the hero) · Let's Talk. Phones keep Let's Talk and move the links into a `Sheet`.
- `[id]` anchors use `scroll-margin-top: 5.5rem` to clear the header.
- Images live in `public/img/<section>/`; `tests/content-assets.test.ts` fails if a path in `lib/content/home.ts` doesn't exist (the build doesn't check). `next/image` in Next 16 uses `preload`, not the deprecated `priority`.
- The spec for everything below "Expertise that connects" (Leadership, contact, footer) was cut off when it was pasted, so those were built from the design screenshot. Check them against the Figma.

## Expertise card graphics (particles)

- `components/Application/Website/home/particles/`: `ParticleGraphic` (the component), `engine.ts` (springs, timing, WebGL2 drawing), `behaviours.ts` (what makes each card move differently). A card picks one with `particles: "burst" | "loops" | "target"` in `lib/content/home.ts`.
- **Assets:** `public/img/base/{starburst,loops,target}.svg`, also used by Vision's stand-ins. They were traced from three PNGs by `node scripts/trace-graphics.mts` (needs `sharp`, a dev dependency). The PNGs aren't in the repo, so put them back in that folder to retrace. Two tones on purpose: the PNGs' other tones were resampling halos, and matching them to half the remaining error took seven tones and 850 KB.
- **Loading:** the SVG is first a plain `<img>`, so it is exact on first paint and is what visitors keep with reduced motion, no JavaScript or no WebGL2. 800px before the viewport the same file is fetched and a canvas replaces it after its first frame. Lost WebGL context falls back to the image.
- **Why WebGL, not SVG nodes or Canvas 2D:** with all three cards running, measured at 1340px and 2×, SVG nodes took 79ms a frame and 15,000 Canvas 2D copies over 200ms. Off screen the loop stops (0ms script).
- **Two grids:** behaviours and springs run in JavaScript on a coarse motion grid (`NODE`, 12 units), uploaded each frame as a small texture. The GPU interpolates it for about 131,000 particles (`PARTICLE`, 2 units, about 1 CSS px on desktop) and adds each one's random stray and sparkle. This holds 16.7ms with about 2.2ms of script. Springs per particle in JavaScript already cost 7ms at 5 units, so make particles smaller here, not by adding JavaScript work per particle. Setup costs about 100 to 130ms per card, once, as it nears the viewport.
- **Pixel rules (don't break these):** particles copy a coverage texture rasterised at the canvas's device resolution, 1:1, to whole device pixels. The vertical scale comes from the whole number of rows, which is how the browser stretches the `<img>`. The canvas is centred by layout (`flex items-center` on the host), not cropped by `preserveAspectRatio`, or it lands a device pixel off the image and blurs at 1×. `DEAD_ZONE` stops small offsets cracking solid areas with hairlines; `MAX_GLOW` keeps dots distinct when bright.
- **Motion:** each card has its own intro (off-screen cards assemble on sight; ones already in view don't, or they'd flash), a continuous base animation while in view, and a hover field. Hovering or focusing a card also lifts its base animation (`ACTIVE_ENERGY`). A tap sends a ripple. Geometry constants in `behaviours.ts` are measured from each image, so re-measure them if the art changes.
- **To verify:** the animation never rests on screen, so to compare with the static file let the canvas settle off screen, freeze `requestAnimationFrame`, scroll back and screenshot. That needs `preserveDrawingBuffer`, forced from the test by wrapping `getContext`. Puppeteer's `clip` is in page coordinates, and an element screenshot resizes the viewport, which fires a false `pointerleave`. To catch mid-animation frames, slow `performance.now` from the test.

## Smooth scrolling (Lenis 1.3.27)

- One global instance: `components/Application/LenisProvider.tsx` (`<ReactLenis root>` in `app/layout.tsx`, so public site, auth and admin). Read it with `useLenis()`; for programmatic scrolling use `lenis.scrollTo(target)` — never `scrollTo({ behavior: "smooth" })` or CSS `scroll-behavior: smooth`.
- Options (module constant; the React adapter rebuilds the instance if options change): `autoRaf`, `anchors` (honours `scroll-margin-top`, so the global `[id] { scroll-margin-top: 5.5rem }` clears the sticky header), `allowNestedScroll` (sidebar, sheets, dialogs, tables, textareas scroll natively), `stopInertiaOnNavigate`, `respectReducedMotion`, `syncTouch: false` (touch stays native), `autoToggle: false`.
- **Overlays:** `ScrollLockSync` watches `<html>`/`<body>` and pauses Lenis whenever anything locks page scroll (Base UI sets `overflow-y: hidden` on `<html>`), resuming when it unlocks. Chosen over `autoToggle`, which needs `transition-behavior` (Safari ≥ 17.4/Firefox ≥ 129) and writes inline `overflow` that fights Base UI's lock.
- **Navigation:** `RouteSync` drops an in-flight glide on pathname change (layout effect, before paint) and on `popstate`, so Next's scroll-to-top and the browser's back/forward restoration win. Query-only changes are untouched.
- **Same-page `#hash` links must be plain `<a>`** (see `TopicLink`), not `<Link>` — Next's own instant hash scroll would fight the glide. Skip-link targets (`main#main-content`, `main#admin-content`) have `tabIndex={-1}`.
- Lenis CSS lives in `app/globals.css` (copied from `lenis/dist/lenis.css`, minus the `.lenis-stopped { overflow: clip }` self-lock and the autoToggle transition — keep in sync on upgrades). Lenis sets `html { height: auto }`, so full-height layouts use `min-h-svh`, not `min-h-full`.
- Scrollable areas that must never be smoothed can opt out with `data-lenis-prevent` (or `-wheel`/`-touch`/`-vertical`/`-horizontal`).
- Verified end to end (19 checks: glide, overlay pause/resume, mid-glide link/back navigation, anchors + header offset + hash + focus, reduced motion, nested scroll, short pages, phone overflow, console) — see Visual verification for the method.

## Visual verification

Pixel work is checked against the Figma by screenshotting a production build: `NEXT_DIST_DIR=.next-check npx next build && NEXT_DIST_DIR=.next-check npx next start -p 3456`, then `puppeteer-core` with the installed Chrome (installed in the session scratchpad, not the project) at 1340px and at 390px with `isMobile` (plain `chrome --headless --window-size` can't go below ~500px wide). The script also reports any element wider than the viewport. Full-page shots above ~16,000 device pixels repeat content (a Chrome limit, not a page bug), so capture the phone page at scale 1. The lead flow can be tested without a real database by pointing `MONGODB_URI` at `mongodb-memory-server`, also from the scratchpad. On Windows, stopping the background `npx next start` task leaves the node child running: free the port by killing the PID whose command line is `next … start -p 3456`.

## Conventions

- Naming: components PascalCase `.tsx`; Next special files lowercase; models `Name.model.ts` exporting `NameModel` via `mongoose.models.X || mongoose.model(...)`; hooks `useX.ts`; emails camelCase functions returning HTML built from `email/_shared.ts` (always `esc()` user input).
- Routes: constants in `routes/*`. Admin: `ADMIN_<ENTITY>_SHOW / _DETAILS(id)`, trash `ADMIN_TRASH_OF(entity)`. New admin page → add constant + `lib/adminSidebarMenu.ts` entry.
- **API route recipe**: `const guard = await requireAdmin(request); if (!guard.ok) return guard.res` → `connectDB()` → Zod `safeParse` (`validationError(error)` returns `{fields}`) → work → `response(success, status, message, data)`; `catch → catchError(error, "friendly message")`. HTTP status always equals `statusCode` (unlike EnergyFlow). Public mutations: `isSameOrigin` + `rateLimit`.
- Resource layout mirrors EnergyFlow: `route.ts` (list), `get/[id]`, `update`, `delete` (PUT `SD` trash / `RSD` restore, DELETE `PD` — **only already-trashed rows**), `export`.
- Soft delete via `deletedAt` (null = live). Escape regex input with `escapeRegex`. Status/notes edits use optimistic concurrency on `updatedAt` (409 → "Reload latest (discard edits)"). Read-state and trash changes use `timestamps: false` so they don't trigger false conflicts.
- Shared vocabularies (inquiry types, statuses, limits) live **only** in `lib/leadConfig.ts`; schemas **only** in `lib/zodSchema.ts` (used by client and server).
- Pure modules (`leadConfig`, `zodSchema`, `safeRedirect`, `csv`, `passwordPolicy`, `generateTicketId`, `format`, `content/home`) use relative `./x.ts` imports so `node --test` can load them; everything else uses `@/`.
- Client fetches go through `lib/apiClient.ts` (`apiFetch` public, `adminFetch` admin — on 401 it clears the cookie and redirects to sign-in with a callback). Admin query keys in `lib/adminQueries.ts`; invalidate those keys after mutations.
- Comments explain *why*, in full sentences, like EnergyFlow. 4-space indent, double quotes, no semicolons.

## Admin authentication (single owner)

- Sign-in = **password → 6-digit code emailed to the owner** → session.
  - Step 1 (`/api/auth/login`) only succeeds for the email in **`ADMIN_EMAIL`**; any other email gets the same "Incorrect email or password" (bcrypt runs against a dummy hash, so timing matches). It sets a signed **challenge cookie** (10 min, path `/api/auth`).
  - Step 2 (`/api/auth/verify-otp`) requires that cookie — knowing the email is never enough (fixes EnergyFlow's reset-without-OTP hole). Code stored as HMAC bound to the challenge; 5 attempts; consumed atomically; resend has 30 s cooldown, max 3.
  - Session: HS256 JWT (`AUTH_SECRET`) in httpOnly, SameSite=Strict cookie (`__Host-mx_admin` in prod), 12 h. Carries `sessionVersion`; bumping it (password change, "sign out everywhere", CLI) revokes all sessions.
- Two layers: `proxy.ts` = optimistic signature check + redirects (no DB). **`requireAdmin()` in `lib/authentication.ts` = the real check** (DB: account exists, email still equals ADMIN_EMAIL, sessionVersion matches) + same-origin check on mutations. Every admin API route must call it.
- Lockout: 10 wrong passwords → 15 min lock (in DB, survives restarts). Per-IP throttles are in-memory (reset on restart, per instance) — acceptable here, same caveat as EnergyFlow.
- Post-login redirect only accepts `/admin…` paths (`lib/safeRedirect.ts`) — fixes EnergyFlow's open redirect.
- No public sign-up / forgot-password. Account management: `npm run admin -- create | reset-password | set-email | unlock | sign-out-all | status` (needs DB access = trust boundary; refuses a second admin).
- Without SMTP in **development**, sign-in codes are printed to the server console. In **production** a failed send returns 503 (no code is created) — SMTP must work or the owner can't sign in.

## Leads (contact form)

- Public `POST /api/lead`: same-origin only, ≤16 KB body, 5 per IP / 10 min, Zod-cleaned (control/zero-width chars stripped, whitespace collapsed, email lowercased, name must contain a letter in any script), honeypot `website` + `elapsedMs < 2.5 s` → fake success (no write), duplicate (same email + message within 10 min) → returns the original `MX-XXXXXXXX` ref. Owner alert email sent with `after()` (never delays/fails the visitor) with Reply-To = visitor; outcome stored in `notifiedAt` / `notifyError` and shown on the lead page.
- Form (name, organisation, email, message): draft kept in sessionStorage, server field errors mapped inline, reference shown on success. It has no topic field: practice area links (`TopicLink`) add `?for=ai|financial|venture|contact` with `replaceState`, which sets `inquiryType` and `source`; otherwise the lead is `general`. `phone` stays optional in the model and API but the form doesn't ask for it.
- Admin list: URL-synced search/filters/sort/page (server clamps out-of-range pages), per-page selection (dropped when the page or filters change), bulk read/unread/trash/restore/delete forever, CSV export (selected or filtered, ≤5000 rows, formula-injection safe, UTF-8 BOM), 60 s polling + refetch on focus, unread badge in sidebar.
- Lead page: auto-marks read, status pipeline (New → Contacted → In discussion → Won / Closed) with history, private notes (≤4000), unsaved-changes guard, conflict detection, reply, plus call/WhatsApp when a lead has a phone (`whatsappLink` still assumes +91 for bare 10-digit numbers), trash/restore/purge.

## Commands

- `npm run dev` · `npm run build` · `npm run lint` · `npm run typecheck` · `npm test`
- Build beside a running dev server: `NEXT_DIST_DIR=.next-check npx next build` (PowerShell: `$env:NEXT_DIST_DIR='.next-check'; npm run build`). ESLint/gitignore already ignore `.next-*`.
- First run: copy `.env.example` → `.env.local` (or `.env`), fill it in, then `npm run admin -- create`.

## Env vars (see `.env.example`)

`NEXT_PUBLIC_SITE_URL`, `MONGODB_URI`, `MONGODB_DB_NAME`, `ADMIN_EMAIL`, `AUTH_SECRET` (≥32 chars; rotating it signs everyone out), `NODEMAILER_HOST/PORT/EMAIL/PASSWORD`, `LEAD_NOTIFICATION_EMAIL` (comma list; falls back to ADMIN_EMAIL).

## Open items / decisions to revisit

- **Stand-ins waiting on the client:** the "Know more" URL (`leadership.moreHref`; the button hides without it), the four Vision images (tinted reuse of the expertise graphics until then), the Vision background (gradients in `Vision.tsx`).
- **Copy was transcribed from a screenshot** of the design (the Figma CSS has styles, not text). Proofread against the Figma. To confirm with the client: "Netherland Based" wording, "Den Haag" in the footer, and the contact address/bio naming Velantis Tech rather than MRIGAVEX.
- The design has no destinations for "Explore …", the practice links or the pathway "+": they go to the contact form with a topic and to the cards. Add detail pages if the client wants them. "Fintech" and "Sectors" in the nav are mapped to the Financial Services card and #practice by assumption.
- Remote images need `images.remotePatterns` **and** CSP `img-src`; embeds need CSP `frame-src` in `next.config.ts`.
- No visitor auto-reply email (client chose owner-only alerts). Template pattern exists if wanted later.
- If deployed on serverless with heavy abuse, move rate limits to a shared store (Upstash/Redis or Mongo TTL).
- Keep this file updated as features land.
