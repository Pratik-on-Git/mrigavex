# MRIGAVEX

Website for MRIGAVEX, an independent advisory firm in AI strategy, financial transformation and responsible venture growth. A single public page, with a private, owner-only admin portal for contact-form leads.

Next.js 16 · TypeScript · Tailwind v4 · MongoDB (Mongoose) · Geist.

## Setup

1. `npm install`
2. Copy `.env.example` to `.env.local` and fill in every value (MongoDB, `ADMIN_EMAIL`, `AUTH_SECRET`, SMTP).
3. Create the admin account (only one can exist):

   ```bash
   npm run admin -- create
   ```

4. `npm run dev` → <http://localhost:3000>. The admin portal is at `/admin` (sign in at `/auth/login`).

Without SMTP configured in development, admin sign-in codes are printed in the server console.

## Admin account

There is no sign-up or "forgot password" on the website. Manage the account from the server:

```bash
npm run admin -- reset-password   # new password, signs out every device
npm run admin -- set-email        # after changing ADMIN_EMAIL
npm run admin -- unlock           # clear a lockout after failed sign-ins
npm run admin -- sign-out-all
npm run admin -- status
```

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build / server |
| `npm run lint` · `npm run typecheck` · `npm test` | Checks |

Page copy and images are set in `lib/content/home.ts`, and site identity in `lib/site.ts`. See `CLAUDE.md` for architecture and conventions.
