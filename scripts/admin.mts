#!/usr/bin/env node
// Owner-only account management. There is intentionally NO sign-up or
// "forgot password" route on the website: whoever can run this script has
// database access, which is the trust boundary for creating or recovering
// the single admin account.
//
//   npm run admin -- create          create the admin (ADMIN_EMAIL) once
//   npm run admin -- reset-password  set a new password, sign out everywhere
//   npm run admin -- set-email       move the account to the current ADMIN_EMAIL
//   npm run admin -- unlock          clear a lockout after failed sign-ins
//   npm run admin -- sign-out-all    revoke every session
//   npm run admin -- status          show account state
//
// Reads .env / .env.local (see package.json). Passwords are prompted with
// hidden input, or taken from ADMIN_PASSWORD for non-interactive use.
// Runs on Node's built-in TypeScript type stripping (Node >= 22.18).

import { createInterface } from "node:readline"
import bcrypt from "bcryptjs"
import mongoose from "mongoose"
import AdminModel from "../models/Admin.model.ts"
import { BCRYPT_ROUNDS, passwordPolicyMessage } from "../lib/passwordPolicy.ts"

const command = process.argv[2]
const COMMANDS = ["create", "reset-password", "set-email", "unlock", "sign-out-all", "status"]

function fail(message: string): never {
    console.error(`\n✖ ${message}\n`)
    process.exit(1)
}

function ask(question: string, hidden = false): Promise<string> {
    return new Promise((resolve) => {
        const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true })
        if (hidden) {
            // Echo nothing while the password is typed.
            ;(rl as unknown as { _writeToOutput: (s: string) => void })._writeToOutput = (text: string) => {
                if (text.includes(question)) process.stdout.write(text)
            }
        }
        rl.question(question, (answer) => {
            rl.close()
            if (hidden) process.stdout.write("\n")
            resolve(answer)
        })
    })
}

async function promptPassword(): Promise<string> {
    const fromEnv = process.env.ADMIN_PASSWORD
    if (fromEnv) {
        const problem = passwordPolicyMessage(fromEnv)
        if (problem) fail(`ADMIN_PASSWORD: ${problem}`)
        return fromEnv
    }
    if (!process.stdin.isTTY) fail("No terminal for a password prompt. Set ADMIN_PASSWORD instead.")

    for (;;) {
        const password = await ask("New password: ", true)
        const problem = passwordPolicyMessage(password)
        if (problem) {
            console.log(`  ${problem}`)
            continue
        }
        const confirm = await ask("Repeat password: ", true)
        if (confirm !== password) {
            console.log("  Passwords don't match. Try again.")
            continue
        }
        return password
    }
}

async function main() {
    if (!command || !COMMANDS.includes(command)) {
        console.log(`Usage: npm run admin -- <${COMMANDS.join(" | ")}>`)
        process.exit(command ? 1 : 0)
    }

    const uri = process.env.MONGODB_URI
    if (!uri) fail("MONGODB_URI is not set (.env.local).")
    const email = process.env.ADMIN_EMAIL?.trim().toLowerCase()
    if (!email && command !== "status") fail("ADMIN_EMAIL is not set (.env.local).")

    await mongoose.connect(uri, { dbName: process.env.MONGODB_DB_NAME || "mrigavex", serverSelectionTimeoutMS: 10_000 })
    await AdminModel.init()

    const admins = await AdminModel.find().select("email sessionVersion lockedUntil failedLoginCount lastLoginAt createdAt").lean()

    switch (command) {
        case "status": {
            if (!admins.length) console.log("No admin account yet. Run: npm run admin -- create")
            for (const admin of admins) {
                console.log({
                    email: admin.email,
                    matchesAdminEmail: admin.email === email,
                    locked: Boolean(admin.lockedUntil && admin.lockedUntil.getTime() > Date.now()),
                    failedLoginCount: admin.failedLoginCount,
                    lastLoginAt: admin.lastLoginAt,
                    createdAt: admin.createdAt,
                })
            }
            break
        }
        case "create": {
            // Single-owner portal: refuse a second account.
            if (admins.length) fail(`An admin already exists (${admins[0].email}). Use reset-password or set-email instead.`)
            const password = await promptPassword()
            await AdminModel.create({ email, passwordHash: await bcrypt.hash(password, BCRYPT_ROUNDS), passwordChangedAt: new Date() })
            console.log(`\n✔ Admin created for ${email}. Sign in at /auth/login.\n`)
            break
        }
        case "reset-password": {
            const admin = admins.find((item) => item.email === email) ?? (admins.length === 1 ? admins[0] : null)
            if (!admin) fail("No admin account found. Run: npm run admin -- create")
            const password = await promptPassword()
            await AdminModel.updateOne(
                { _id: admin._id },
                {
                    $set: { passwordHash: await bcrypt.hash(password, BCRYPT_ROUNDS), passwordChangedAt: new Date(), failedLoginCount: 0, lockedUntil: null },
                    $inc: { sessionVersion: 1 },
                }
            )
            console.log(`\n✔ Password reset for ${admin.email}. Every session was signed out.\n`)
            break
        }
        case "set-email": {
            if (admins.length !== 1) fail(admins.length ? "More than one admin record exists; fix the admins collection manually." : "No admin account found.")
            if (admins[0].email === email) {
                console.log(`Already set to ${email}.`)
                break
            }
            await AdminModel.updateOne({ _id: admins[0]._id }, { $set: { email }, $inc: { sessionVersion: 1 } })
            console.log(`\n✔ Admin email changed ${admins[0].email} → ${email}. Every session was signed out.\n`)
            break
        }
        case "unlock": {
            await AdminModel.updateMany({}, { $set: { failedLoginCount: 0, lockedUntil: null } })
            console.log("\n✔ Lockout cleared.\n")
            break
        }
        case "sign-out-all": {
            await AdminModel.updateMany({}, { $inc: { sessionVersion: 1 } })
            console.log("\n✔ Every session was signed out.\n")
            break
        }
    }
}

main()
    .catch((error) => fail(error?.message ?? String(error)))
    .finally(() => mongoose.disconnect())
